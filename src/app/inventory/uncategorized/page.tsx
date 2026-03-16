
'use client'

import { useState, useEffect } from 'react'
import { getUncategorizedItems, updateItemCategory } from '@/app/actions/uncategorized'

export default function UncategorizedPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = () => {
    setLoading(true)
    getUncategorizedItems().then(data => {
      setItems(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleCategorize = async (id: string, category: 'Bahan Basah' | 'Bahan Kering') => {
    await updateItemCategory(id, category)
    // Optimistic update: remove item from list
    setItems(items.filter(item => item.id !== id))
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Uncategorized Items</h1>
          <p className="text-gray-500 text-sm mt-1">
            Items that need to be assigned to "Bahan Basah" or "Bahan Kering".
          </p>
        </div>
        <div className="text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
          {items.length} items found
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name / SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Assign Category</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{item.sku}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-medium">
                  {item.category || 'Unassigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button 
                    onClick={() => handleCategorize(item.id, 'Bahan Basah')}
                    className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors shadow-sm text-xs uppercase tracking-wide"
                  >
                    Bahan Basah
                  </button>
                  <button 
                    onClick={() => handleCategorize(item.id, 'Bahan Kering')}
                    className="text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-md transition-colors shadow-sm text-xs uppercase tracking-wide"
                  >
                    Bahan Kering
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
                  <p className="mt-1">All inventory items have been categorized properly.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
