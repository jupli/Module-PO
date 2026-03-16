// @ts-nocheck
'use server'

import { prisma } from '@/lib/prisma'
import { MovementType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function extractAndSaveRecipes(items: any[], date?: string, requestId?: string) {
  try {
    // 1. Group items by category (which is the Menu Name)
    const groupedItems: { [key: string]: { items: any[], portions: number } } = {}

    items.forEach(item => {
      const fullCategory = item.category
      
      // Extract portions (e.g., "(200 porsi)")
      const match = fullCategory.match(/\((\d+)\s*porsi\)/i)
      const portions = match ? parseInt(match[1]) : 1

      // Remove numbering like "A. ", "B. " etc. and (xxx porsi) for cleaner menu names
      const cleanCategory = fullCategory.replace(/^[A-Z]\.\s+/, '').split('(')[0].trim()
      
      if (!groupedItems[cleanCategory]) {
        groupedItems[cleanCategory] = { items: [], portions }
      }
      groupedItems[cleanCategory].items.push(item)
    })

    // 2. Save each group as a Recipe
    for (const [menuName, data] of Object.entries(groupedItems)) {
      const { items: ingredients, portions } = data

      // Check if already exists for this request to prevent duplicates
      if (requestId) {
        const existing = await prisma.recipe.findFirst({
            where: {
                name: menuName,
                requestId: requestId
            }
        })
        if (existing) {
            console.log(`Skipping duplicate recipe batch: ${menuName} (Request: ${requestId})`)
            continue
        }
      }

      // Always create a new Recipe (Batch) to support FIFO
      // Link it with purchaseDate
      await prisma.recipe.create({
        data: {
          name: menuName,
          defaultPortion: portions,
          purchaseDate: date ? new Date(date) : new Date(),
          requestId: requestId,
          description: `Auto-generated from purchase request (Base yield: ${portions} porsi)`,
          ingredients: {
            create: await Promise.all(ingredients.map(async (ing) => {
              // Normalize name
              const normalizedName = ing.name.trim()
              // Create a clean SKU candidate (uppercase, replace non-alphanumeric with -)
              const skuCandidate = normalizedName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')

              // 1. Try finding by clean SKU first
              let product = await prisma.product.findUnique({
                where: { sku: skuCandidate }
              })

              // 2. If not found, try finding by Name (case-insensitive)
              if (!product) {
                  product = await prisma.product.findFirst({
                      where: { 
                        name: {
                            equals: normalizedName
                        }
                      }
                  })
              }
              
              // 3. If still not found, create it (WITHOUT random suffix)
              if (!product) {
                 try {
                    product = await prisma.product.create({
                        data: {
                            name: normalizedName,
                            sku: skuCandidate,
                            unit: ing.unit,
                            quantity: 0,
                            category: 'Lain-lain' // Default category, user can organize later
                        }
                    })
                 } catch (createError) {
                    // If creation fails (likely race condition or SKU collision), try fetching again
                    console.log(`Product creation failed for ${skuCandidate}, retrying fetch...`)
                    product = await prisma.product.findUnique({
                        where: { sku: skuCandidate }
                    })
                 }
              }

              // If still undefined (should not happen), throw or skip
              if (!product) {
                  throw new Error(`Failed to resolve product for ingredient: ${ing.name}`)
              }

              // Calculate quantity per 1 portion
              const qtyPerPortion = parseFloat(ing.quantity) / portions

              return {
                productId: product.id,
                quantity: qtyPerPortion,
                unit: ing.unit,
                notes: ing.notes
              }
            }))
          }
        }
      })
      console.log(`Created recipe batch: ${menuName} (Date: ${date})`)
    }

    revalidatePath('/inventory/outgoing')
    return { success: true }
  } catch (error) {
    console.error('Error saving recipes:', error)
    return { success: false, error: 'Failed to extract recipes' }
  }
}

export async function getRecipes() {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            product: true
          }
        }
      },
      orderBy: { purchaseDate: 'asc' } // FIFO: Oldest purchase date first
    })
    return { success: true, recipes }
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return { success: false, error: 'Failed to fetch recipes' }
  }
}

export async function cookMenu(recipeId: string, portions: number) {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: {
            product: true
          }
        }
      }
    })

    if (!recipe) {
      return { success: false, error: 'Recipe not found' }
    }

    // 1. Check stock availability
    const insufficientStock: string[] = []
    
    for (const item of recipe.ingredients) {
      const requiredQty = item.quantity * portions
      if (item.product.quantity < requiredQty) {
        insufficientStock.push(`${item.product.name} (Stok: ${item.product.quantity}, Butuh: ${requiredQty})`)
      }
    }

    if (insufficientStock.length > 0) {
      return { 
        success: false, 
        error: `Stok tidak cukup untuk menu ${recipe.name}:\n${insufficientStock.join('\n')}` 
      }
    }

    // 2. Deduct stock using Transaction
    await prisma.$transaction(async (tx) => {
      for (const item of recipe.ingredients) {
        const quantityToDeduct = item.quantity * portions
        
        // Update Product Stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { decrement: quantityToDeduct }
          }
        })

        // Log Stock Movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.OUT,
            quantity: quantityToDeduct,
            reference: `COOK-${recipe.name}`,
            notes: `Masak ${portions} porsi ${recipe.name}`
          }
        })
      }

      // Delete the recipe batch after cooking (consumed)
      await tx.recipe.delete({
        where: { id: recipeId }
      })

      // 3. Add to Delivery Queue
      await tx.deliveryQueue.create({
        data: {
          menuName: recipe.name,
          quantity: portions,
          status: 'PENDING_QC',
          cookDate: new Date()
        }
      })
    })

    revalidatePath('/inventory/outgoing')
    return { success: true }
  } catch (error) {
    console.error('Error cooking menu:', error)
    return { success: false, error: 'Failed to process cooking' }
  }
}
