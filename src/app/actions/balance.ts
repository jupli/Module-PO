'use server'

import { prisma } from '@/lib/prisma'

export interface BalanceItem {
  id: string
  date: Date
  poNumber: string
  supplierName: string
  purchaseAmount: number
  returnAmount: number
  netAmount: number
  status: string
  items: string // Summary of items
}

export async function getPurchaseBalance() {
  try {
    const allPOs = await prisma.purchaseOrder.findMany({
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

    // Group by base PO Number (ignoring "RET-")
    const grouped = new Map<string, BalanceItem>()

    for (const po of allPOs) {
      // Determine if this is a Return PO
      const isReturn = po.poNumber.includes('-RET-')
      
      // Extract Base PO Number
      // PO-20260308-001 -> Base: PO-20260308-001
      // PO-RET-20260308-001 -> Base: PO-20260308-001
      const basePoNumber = isReturn 
        ? po.poNumber.replace('-RET-', '-') 
        : po.poNumber

      if (!grouped.has(basePoNumber)) {
        grouped.set(basePoNumber, {
          id: po.id, // Use ID of the first encountered (usually original if desc, or return if desc? actually createdAt desc means newest first)
          // We want the Original PO's date and details ideally.
          // If we encounter Return first (newest), we might want to wait or just init.
          date: po.createdAt,
          poNumber: basePoNumber,
          supplierName: po.supplier?.name || 'Unknown',
          purchaseAmount: 0,
          returnAmount: 0,
          netAmount: 0,
          status: po.status,
          items: ''
        })
      }

      const entry = grouped.get(basePoNumber)!

      // Update entry details if we found the Original PO (non-return)
      // This ensures we have the correct Supplier and Date from the original order
      if (!isReturn) {
        entry.id = po.id
        entry.date = po.createdAt
        entry.supplierName = po.supplier?.name || 'Unknown'
        entry.status = po.status
        entry.purchaseAmount += Number(po.totalAmount)
        entry.items = po.items.map((i: any) => `${i.product.name} (${i.quantity})`).join(', ')
      } else {
        // It's a return
        entry.returnAmount += Number(po.totalAmount)
      }
    }

    // Calculate Net Amount for all
    const result: BalanceItem[] = []
    for (const entry of grouped.values()) {
        // CORRECTION: 
        // The Original PO's totalAmount has already been updated to reflect ONLY the Good Items (Net).
        // So, entry.purchaseAmount currently holds the Net Purchase Amount.
        // To show the Gross Purchase Amount (Total Awal), we must ADD the Return Amount back to it.
        
        const netAmount = entry.purchaseAmount // This is the actual billable amount (Original PO)
        const grossAmount = netAmount + entry.returnAmount // This is the initial order value

        // We want to display:
        // Purchase Amount: Gross (Initial)
        // Return Amount: Return
        // Net Amount: Net (Final Bill)
        
        entry.purchaseAmount = grossAmount
        entry.netAmount = netAmount
        
        result.push(entry)
    }

    // Sort by Date Descending
    return result.sort((a, b) => b.date.getTime() - a.date.getTime())

  } catch (error) {
    console.error('Failed to get purchase balance:', error)
    return []
  }
}
