'use client'

import { useState } from 'react'

interface IncomingArchiveProps {
  receivedHistory: any[]
}

export default function IncomingArchive({ receivedHistory }: IncomingArchiveProps) {
  const [expandedDates, setExpandedDates] = useState<string[]>([])

  // Group by PO Date (using the 'date' field from PO, not 'createdAt')
  const groupedData = receivedHistory.reduce((acc: any, po: any) => {
    const date = new Date(po.date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(po)
    return acc
  }, {})

  const toggleDate = (date: string) => {
    setExpandedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    )
  }

  const sortedDates = Object.keys(groupedData).sort((a, b) => {
    // Convert back to date object for sorting
    // Assuming format "28 Januari 2026"
    // This simple sort might fail with localized strings, so we might need a better approach if strict sorting is needed.
    // However, the input data is already sorted by date descending from the server action.
    // So the keys insertion order might be preserved or we can rely on the fact that we iterate object keys.
    // Better: Sort by parsing the date or rely on original order if possible.
    return 0 // Keep original order (assuming receivedHistory is sorted)
  })

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-medium text-gray-900">Arsip Penerimaan & Retur</h2>
        <p className="text-sm text-gray-500">Riwayat barang yang sudah diterima dan catatan retur (Dikelompokkan per Tanggal PO).</p>
      </div>

      {Object.keys(groupedData).length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          Belum ada riwayat penerimaan barang.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {Object.entries(groupedData).map(([date, items]: [string, any]) => (
            <div key={date} className="bg-white">
              {/* Folder Header */}
              <button 
                onClick={() => toggleDate(date)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <svg 
                    className={`w-6 h-6 text-yellow-500 transition-transform ${expandedDates.includes(date) ? 'rotate-90' : ''}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-lg font-medium text-gray-900">{date}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {items.length} PO
                  </span>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedDates.includes(date) ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Content */}
              {expandedDates.includes(date) && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. PO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. DO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Terima</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penerima</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pengirim</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diterima</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diretur</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kondisi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((po: any) => {
                        const totalReceived = po.goodsReceipt?.items.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0
                        const totalRejected = po.goodsReceipt?.items.reduce((acc: number, item: any) => acc + item.quantityRejected, 0) || 0
                        
                        return (
                          <tr key={po.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                              {po.poNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {po.goodsReceipt?.doNumber || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {po.supplier.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {po.goodsReceipt?.receivedAt ? new Date(po.goodsReceipt.receivedAt).toLocaleDateString('id-ID') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{po.goodsReceipt?.receiver || '-'}</span>
                                {po.goodsReceipt?.receiverSign && (
                                  <img 
                                    src={po.goodsReceipt.receiverSign} 
                                    alt="TTD Penerima" 
                                    className="h-12 w-auto object-contain mt-1 border rounded bg-white" 
                                    title={`TTD oleh ${po.goodsReceipt.receiver}`}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{po.goodsReceipt?.courier || '-'}</span>
                                {po.goodsReceipt?.courierSign && (
                                  <img 
                                    src={po.goodsReceipt.courierSign} 
                                    alt="TTD Pengirim" 
                                    className="h-12 w-auto object-contain mt-1 border rounded bg-white"
                                    title={`TTD oleh ${po.goodsReceipt.courier}`}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                              {totalReceived} unit
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              {totalRejected > 0 ? `${totalRejected} unit (RETUR)` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {po.goodsReceipt?.condition || 'Baik'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
