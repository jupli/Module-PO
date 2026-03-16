import React from 'react'
import { getRecipes } from '@/app/actions/recipe'
import Link from 'next/link'

interface Product {
  name: string
  unit: string
}

interface Ingredient {
  id: string
  quantity: number
  unit: string
  product: Product
}

interface Recipe {
  id: string
  name: string
  description: string | null
  ingredients: Ingredient[]
  purchaseDate?: Date
  updatedAt: Date
}

export default async function RecipesPage() {
  const { success, recipes, error } = await getRecipes()

  if (!success || !recipes) {
    return (
      <div className="p-8 text-red-500">
        Error loading recipes: {error}
      </div>
    )
  }

  // Cast recipes to our defined type since we know the structure matches
  const typedRecipes = recipes as unknown as Recipe[]

  // Group recipes by name to avoid duplicates in display
  const groupedRecipes = typedRecipes.reduce((acc, recipe) => {
    if (!acc[recipe.name]) {
      acc[recipe.name] = []
    }
    acc[recipe.name].push(recipe)
    return acc
  }, {} as Record<string, Recipe[]>)

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Jadwal Masak Menu</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel: Calendar */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 sticky top-4">
             <div className="bg-blue-600 text-white p-4 rounded-t-lg mb-4">
               <h2 className="text-lg font-bold">Jadwal Operasional</h2>
               <p className="text-sm opacity-90">Pilih tanggal untuk melihat menu & kebutuhan.</p>
             </div>
             
             <div className="mb-4">
               <div className="flex justify-between items-center mb-4">
                 <button className="text-gray-500 hover:text-gray-700">&lt;</button>
                 <span className="font-semibold text-lg">Januari 2026</span>
                 <button className="text-gray-500 hover:text-gray-700">&gt;</button>
               </div>
               
               <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                 <span className="text-gray-400">M</span>
                 <span className="text-gray-400">S</span>
                 <span className="text-gray-400">S</span>
                 <span className="text-gray-400">R</span>
                 <span className="text-gray-400">K</span>
                 <span className="text-gray-400">J</span>
                 <span className="text-gray-400">S</span>
               </div>
               
               <div className="grid grid-cols-7 gap-1 text-center">
                 {/* Placeholder Calendar Days */}
                 {Array.from({ length: 4 }).map((_, i) => <span key={`empty-${i}`} />)}
                 {Array.from({ length: 31 }).map((_, i) => {
                    const day = i + 1
                    const isSelected = day === 12
                    return (
                      <button 
                        key={day}
                        className={`p-2 rounded-full w-8 h-8 flex items-center justify-center mx-auto ${
                          isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    )
                 })}
               </div>
             </div>
          </div>
        </div>

        {/* Right Panel: Recipe List */}
        <div className="w-full lg:w-2/3 space-y-6">
            {Object.entries(groupedRecipes).map(([name, batchList]) => {
            const recipe = batchList[0] // Use the first one for display details
            
            return (
                <div key={name} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{recipe.name}</h2>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Menu
                    </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-4">{recipe.description}</p>

                <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                    <p className="text-sm font-semibold text-blue-800 mb-1">Stok Batch Tersedia:</p>
                    <div className="flex flex-wrap gap-2">
                    {batchList.map((batch, idx) => (
                        <span key={batch.id} className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded">
                        {batch.purchaseDate ? new Date(batch.purchaseDate).toLocaleDateString('id-ID') : 'No Date'}
                        </span>
                    ))}
                    </div>
                </div>

                <h3 className="font-semibold text-gray-700 mb-2">Bahan-bahan (per porsi):</h3>
                <ul className="space-y-2 mb-6">
                    {recipe.ingredients.map((item) => (
                    <li key={item.id} className="text-sm flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-600">{item.product.name}</span>
                        <span className="font-medium text-gray-900">
                        {item.quantity} {item.unit}
                        </span>
                    </li>
                    ))}
                </ul>

                <div className="pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-400">
                    Terakhir update: {new Date(recipe.updatedAt).toLocaleDateString()}
                    </div>
                </div>
                </div>
            )
            })}
        </div>
      </div>
    </div>
  )
}
