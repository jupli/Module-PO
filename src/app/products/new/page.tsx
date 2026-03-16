'use client'

import { createProduct } from '../../actions/product'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function NewProductForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedCategory = searchParams.get('category') || ''
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const res = await createProduct(formData)
    if (res.success) {
      router.push('/products')
    } else {
      setError(res.error || 'Something went wrong')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Product Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            name="name"
            type="text"
            required
            placeholder="Product Name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sku">
            SKU
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="sku"
            name="sku"
            type="text"
            required
            placeholder="Stock Keeping Unit"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
            Category
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
            id="category"
            name="category"
            defaultValue={preSelectedCategory}
          >
            <option value="">Uncategorized (Lain-lain)</option>
            <option value="Bahan Kering">Bahan Kering</option>
            <option value="Bahan Basah">Bahan Basah</option>
          </select>
          <p className="text-gray-500 text-xs italic mt-1">
            Selected category will ensure the item appears in the correct folder structure.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            name="description"
            rows={3}
            placeholder="Product Description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
              Price
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="price"
              name="price"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unit">
              Unit
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="unit"
              name="unit"
              type="text"
              defaultValue="pcs"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantity">
            Initial Quantity
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="quantity"
            name="quantity"
            type="number"
            defaultValue="0"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            Create Product
          </button>
          <button
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            type="button"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <NewProductForm />
    </Suspense>
  )
}
