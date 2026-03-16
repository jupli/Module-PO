'use client'

import { useState } from 'react'
import { updateItemPrice, submitToPurchase } from '@/app/actions/purchase'

interface PurchaseRequestItem {
  id: string
  itemName: string
  category: string | null
  portion?: string | null
  quantity: number
  unit: string
  price: number
  notes: string | null
}

interface PurchaseRequest {
  id: string
  requestDate: string | Date
  notes: string | null
  status: string
  rejectionReason?: string | null
  items: PurchaseRequestItem[]
}

export default function PurchaseClient({ requests }: { requests: PurchaseRequest[] }) {
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null)
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id)
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handlePriceChange = async (itemId: string, val: string) => {
    const price = parseFloat(val)
    if (isNaN(price)) return
    
    // We can use useTransition or optimistic updates, but for now simple await
    // Note: This might be slow on every keystroke, so usually onBlur is better
  }

  const handlePriceBlur = async (itemIds: string[], val: string) => {
    const price = parseFloat(val)
    if (isNaN(price)) return

    const loadingKey = itemIds.join(',')
    setLoadingPrice(loadingKey)
    try {
      await Promise.all(itemIds.map(id => updateItemPrice(id, price)))
    } catch (error) {
      console.error('Failed to update price', error)
      alert('Gagal menyimpan harga')
    } finally {
      setLoadingPrice(null)
    }
  }

  const handleSubmit = async (requestId: string) => {
    if (!confirm('Apakah Anda yakin ingin memproses pembelian ini? Pastikan semua harga sudah terisi.')) return
    
    const res = await submitToPurchase(requestId)
    if (res.success) {
      alert(res.message)
    } else {
      alert(res.message)
    }
  }

  // Calculate total per request
  const getTotal = (items: PurchaseRequestItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow text-gray-500">
        Belum ada permintaan yang disetujui (APPROVED). Silakan proses permintaan di menu Permintaan Bahan.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {requests.map((req) => (
        <div key={req.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
          {/* Header */}
          <div 
            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
            onClick={() => toggleExpand(req.id)}
          >
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Permintaan: {new Date(req.requestDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {req.status === 'REJECTED' && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full border border-red-200 uppercase">
                    Ditolak
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{req.notes || '-'}</p>
              
              {req.status === 'REJECTED' && req.rejectionReason && (
                <div className="mt-3 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold">Alasan Penolakan:</p>
                    <p>{req.rejectionReason}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Estimasi</p>
                <p className="text-lg font-bold text-blue-600">
                  Rp {getTotal(req.items).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <svg 
                className={`w-6 h-6 text-gray-400 transform transition-transform ${expandedRequestId === req.id ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Content */}
          {expandedRequestId === req.id && (
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              {(() => {
                // Helper to format numbers cleanly (max 3 decimals to show precision, no trailing zeros)
                const formatNum = (num: number) => {
                  return num.toLocaleString('id-ID', { maximumFractionDigits: 3 })
                }

                // Group items by name, category, and unit first
                const groupedItems = req.items.reduce((acc, item) => {
                  const key = `${item.itemName}-${item.category || ''}-${item.unit}`.toLowerCase()
                  
                  if (!acc[key]) {
                    acc[key] = {
                      itemName: item.itemName,
                      category: item.category,
                      unit: item.unit,
                      price: item.price,
                      notes: item.notes,
                      largeItems: [] as typeof item[],
                      smallItems: [] as typeof item[],
                      bufferItems: [] as typeof item[]
                    }
                  }
                  
                  const group = acc[key]
                  if (item.price > 0) group.price = item.price
                  
                  if (item.portion === 'Large') {
                    group.largeItems.push(item)
                  } else if (item.portion === 'Small') {
                    group.smallItems.push(item)
                  } else {
                    group.bufferItems.push(item)
                  }
                  
                  return acc
                }, {} as Record<string, {
                  itemName: string,
                  category: string | null,
                  unit: string,
                  price: number,
                  notes: string | null,
                  largeItems: typeof req.items,
                  smallItems: typeof req.items,
                  bufferItems: typeof req.items
                }>)

                // Flatten groups into display items using greedy pairing (zip Large/Small/Buffer lists)
                const unifiedItems = Object.values(groupedItems).flatMap(group => {
                  const maxCount = Math.max(
                    group.largeItems.length, 
                    group.smallItems.length,
                    group.bufferItems.length
                  )
                  
                  const rows = []
                  for (let i = 0; i < maxCount; i++) {
                    const largeItem = group.largeItems[i]
                    const smallItem = group.smallItems[i]
                    const bufferItem = group.bufferItems[i]
                    
                    const largeQty = largeItem ? largeItem.quantity : 0
                    const smallQty = smallItem ? smallItem.quantity : 0
                    const bufferQty = bufferItem ? bufferItem.quantity : 0
                    
                    const ids: string[] = []
                    if (largeItem) ids.push(largeItem.id)
                    if (smallItem) ids.push(smallItem.id)
                    if (bufferItem) ids.push(bufferItem.id)

                    // Use notes from the first available item in this row
                    const notes = largeItem?.notes || smallItem?.notes || bufferItem?.notes || group.notes
                    
                    rows.push({
                      ids,
                      itemName: group.itemName,
                      category: group.category,
                      largeQty,
                      smallQty,
                      bufferQty,
                      totalQty: largeQty + smallQty + bufferQty,
                      unit: group.unit,
                      price: group.price,
                      notes
                    })
                  }
                  return rows
                })

                // Filter & Sort
                let displayItems = unifiedItems.filter(item => 
                  item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
                )

                if (sortConfig) {
                  displayItems.sort((a, b) => {
                    const aVal = a[sortConfig.key as keyof typeof a]
                    const bVal = b[sortConfig.key as keyof typeof b]
                    
                    if (aVal === bVal) return 0
                    if (aVal === null || aVal === undefined) return 1
                    if (bVal === null || bVal === undefined) return -1
                    
                    const comparison = aVal < bVal ? -1 : 1
                    return sortConfig.direction === 'asc' ? comparison : -comparison
                  })
                }

                return (
                  <div className="space-y-4">
                    {/* Search & Sort Controls */}
                    <div className="flex gap-4 items-center bg-white p-3 rounded-lg border border-gray-200">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Cari nama bahan atau kategori..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                            onClick={() => handleSort('itemName')}
                          >
                            Nama Bahan {sortConfig?.key === 'itemName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                            onClick={() => handleSort('category')}
                          >
                            Kategori {sortConfig?.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                            onClick={() => handleSort('largeQty')}
                          >
                            Porsi Besar {sortConfig?.key === 'largeQty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                            onClick={() => handleSort('smallQty')}
                          >
                            Porsi Kecil {sortConfig?.key === 'smallQty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                            onClick={() => handleSort('bufferQty')}
                          >
                            Buffer (Sisa) {sortConfig?.key === 'bufferQty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                            onClick={() => handleSort('totalQty')}
                          >
                            Qty (Total) {sortConfig?.key === 'totalQty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Satuan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[120px] w-[120px] whitespace-nowrap">Harga Satuan (Rp)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displayItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.itemName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.category}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.largeQty > 0 ? formatNum(item.largeQty) : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.smallQty > 0 ? formatNum(item.smallQty) : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 bg-gray-50 whitespace-nowrap">{item.bufferQty > 0 ? formatNum(item.bufferQty) : '-'}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">{formatNum(item.totalQty)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.unit}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <input
                                type="number"
                                defaultValue={item.price === 0 ? '' : item.price}
                                placeholder="0"
                                className="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1 border"
                                onBlur={(e) => handlePriceBlur(item.ids, e.target.value)}
                              />
                              {loadingPrice === item.ids.join(',') && <span className="text-xs text-blue-500 ml-1">Saving...</span>}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                              Rp {(item.totalQty * item.price).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )
              })()}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSubmit(req.id)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                >
                  Ajukan Pembelian (PO)
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
