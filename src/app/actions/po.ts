'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { POStatus, MovementType } from '@prisma/client'

export async function getPurchaseOrders() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return orders.map((order: any) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.price),
        total: Number(item.quantity * item.price),
        product: item.product ? {
          ...item.product,
          price: Number(item.product.price)
        } : null
      }))
    }))
  } catch (error) {
    console.error('Database Error:', error)
    return []
  }
}

export async function getPurchaseOrderById(id: string) {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) return null

    return {
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.price),
        total: Number(item.quantity * item.price),
        product: item.product ? {
          ...item.product,
          price: Number(item.product.price)
        } : null
      }))
    }
  } catch (error) {
    console.error('Database Error:', error)
    return null
  }
}

export async function getReceivedPurchaseOrders() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { status: 'RECEIVED' },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        goodsReceipt: {
          include: {
            items: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return orders.map((order: any) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.price),
        total: Number(item.quantity * item.price),
        product: item.product ? {
          ...item.product,
          price: Number(item.product.price)
        } : null
      })),
      goodsReceipt: order.goodsReceipt ? {
        ...order.goodsReceipt,
        items: order.goodsReceipt.items.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity),
            quantityRejected: Number(item.quantityRejected)
        }))
      } : null
    }))
  } catch (error) {
    console.error('Database Error:', error)
    return []
  }
}

export async function getPurchaseOrdersByStatus(status: POStatus) {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { status },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return orders.map((order: any) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.price),
        total: Number(item.quantity * item.price),
        product: item.product ? {
          ...item.product,
          price: Number(item.product.price)
        } : null
      }))
    }))
  } catch (error) {
    console.error('Database Error:', error)
    return []
  }
}

export async function createGoodsReceipt(data: {
  poId: string
  doNumber: string
  receivedAt: Date
  receiver: string
  receiverSign: string
  courier: string
  courierSign: string
  condition: string
  notes?: string
  items: { productId: string, quantity: number, quantityRejected?: number, condition?: string }[]
}) {
  try {
    // 0. Check if Receipt already exists
    const existingReceipt = await prisma.goodsReceipt.findUnique({
      where: { poId: data.poId }
    })

    if (existingReceipt) {
      return { success: false, error: 'Goods Receipt already exists for this PO.' }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create GoodsReceipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          poId: data.poId,
          doNumber: data.doNumber,
          receivedAt: data.receivedAt,
          receiver: data.receiver,
          receiverSign: data.receiverSign,
          courier: data.courier,
          courierSign: data.courierSign,
          condition: data.condition,
          notes: data.notes,
          items: {
            create: data.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              quantityRejected: item.quantityRejected || 0,
              condition: item.condition
            }))
          }
        }
      })

      // 2. Update PO Status to RECEIVED
      const po = await tx.purchaseOrder.update({
        where: { id: data.poId },
        data: { status: 'RECEIVED' },
        include: { items: true }
      })

      // Update PO items in parallel
      await Promise.all(data.items.map(async (receivedItem: any) => {
          const originalItem = po.items.find((i: any) => i.productId === receivedItem.productId)
          if (originalItem) {
              await tx.purchaseOrderItem.update({
                  where: { id: originalItem.id },
                  data: { quantity: receivedItem.quantity }
              })
          }
      }))

      // Calculate total amount
      let updatedTotalAmount = 0
      for (const receivedItem of data.items) {
          const originalItem = po.items.find((i: any) => i.productId === receivedItem.productId)
          if (originalItem) {
              updatedTotalAmount += (receivedItem.quantity * Number(originalItem.price))
          }
      }

      await tx.purchaseOrder.update({
          where: { id: data.poId },
          data: { totalAmount: updatedTotalAmount }
      })

      // Update stock and create movement in parallel
      await Promise.all(data.items.map(async (item: any) => {
        if (item.quantity > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                quantity: { increment: item.quantity }
              }
            })

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: MovementType.IN,
                quantity: item.quantity,
                reference: `${po.poNumber} / ${data.doNumber}`,
                notes: `Received via Goods Receipt (DO: ${data.doNumber})`
              }
            })
        }
      }))

      // 4. Handle Returns (Auto-Create Replacement PO)
      const rejectedItems = data.items.filter((i: any) => i.quantityRejected && i.quantityRejected > 0)
      
      if (rejectedItems.length > 0) {
        const newPOItems = rejectedItems.map((rejItem: any) => {
             const originalItem = po.items.find((i: any) => i.productId === rejItem.productId)
             const unitPrice = originalItem ? Number(originalItem.price) : 0
             const qty = Number(rejItem.quantityRejected)
             return {
                 productId: rejItem.productId,
                 quantity: qty,
                 unitPrice: unitPrice,
                 total: qty * unitPrice
             }
        })
        
        const totalAmount = newPOItems.reduce((sum: number, item: any) => sum + item.total, 0)
        
        // Create unique PO Retur Number
        // Format: PO-RET-[Original-Suffix]
        const originalSuffix = po.poNumber.split('-').slice(1).join('-') // Remove first 'PO'
        const poNumber = `PO-RET-${originalSuffix}`
        
        await tx.purchaseOrder.create({
            data: {
                poNumber: poNumber,
                supplierId: po.supplierId,
                status: 'PENDING', // Needs approval before sending to supplier
                totalAmount: totalAmount,
                items: {
                    create: newPOItems.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.unitPrice
                    }))
                }
            }
        })
      }

      return receipt
    }, {
      maxWait: 10000,
      timeout: 60000
    })

    revalidatePath('/inventory/incoming')
    revalidatePath('/purchase-orders')
    revalidatePath('/products')
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Failed to create goods receipt:', error)
    return { success: false, error: 'Failed to create goods receipt' }
  }
}

export async function createPurchaseOrder(data: {
  supplierId: string,
  items: { productId: string, quantity: number, unitPrice: number }[]
}) {
  try {
    // Generate PO Number
    const count = await prisma.purchaseOrder.count()
    const poNumber = `PO-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`

    const totalAmount = data.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)

    await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        totalAmount,
        status: 'PENDING',
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice
          }))
        }
      }
    })
    revalidatePath('/purchase-orders')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to create PO' }
  }
}

export async function updatePOStatus(id: string, status: POStatus) {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!po) return { success: false, error: 'PO not found' }

    // If status is changed to RECEIVED, update inventory
    if (status === 'RECEIVED' && po.status !== 'RECEIVED') {
      await prisma.$transaction(async (tx: any) => {
        // Update PO status
        await tx.purchaseOrder.update({
          where: { id },
          data: { status }
        })

        // Update Inventory
        for (const item of po.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: { increment: item.quantity }
            }
          })

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: MovementType.IN,
              quantity: item.quantity,
              reference: po.poNumber,
              notes: `Received from PO ${po.poNumber}`
            }
          })
        }
      })
    } else {
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status }
      })
    }

    revalidatePath('/purchase-orders')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to update PO status' }
  }
}

export async function updatePurchaseOrderItems(poId: string, items: { id: string, quantity: number }[]) {
  try {
    await prisma.$transaction(async (tx: any) => {
       for (const item of items) {
         // Get current item to get price
         const currentItem = await tx.purchaseOrderItem.findUnique({ where: { id: item.id } })
         if (!currentItem) continue
         
         await tx.purchaseOrderItem.update({
           where: { id: item.id },
           data: {
             quantity: item.quantity
           }
         })
       }
       
       // Recalculate PO Total
       const allItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } })
       const totalAmount = allItems.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0)
       
       await tx.purchaseOrder.update({
         where: { id: poId },
         data: { totalAmount }
       })
    })
    
    revalidatePath('/purchase-orders')
    revalidatePath(`/purchase-orders/${poId}`)
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to update PO items' }
  }
}
