
'use client'

import { useState, useEffect } from 'react'
import { getPurchaseBalance, BalanceItem } from '@/app/actions/balance'

export default function BalancePage() {
  const [data, setData] = useState<BalanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    getPurchaseBalance().then(items => {
      setData(items)
      setLoading(false)
    })
  }, [])

  const filteredData = data.filter(item => 
    item.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.items.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Calculate Totals
  const totalPurchase = filteredData.reduce((sum, item) => sum + item.purchaseAmount, 0)
  const totalReturn = filteredData.reduce((sum, item) => sum + item.returnAmount, 0)
  const totalNet = filteredData.reduce((sum, item) => sum + item.netAmount, 0)

  if (loading) return <div className="p-8 text-center">Loading Data...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Neraca Pembelian (Purchase Balance)</h1>
            <p className="text-gray-500 mt-1">Laporan pembelian dan retur barang</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <input 
                type="text" 
                placeholder="Cari No. PO / Supplier..." 
                className="border border-gray-300 px-4 py-2 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-semibold uppercase">Total Pembelian (Gross)</h3>
            <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(totalPurchase)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <h3 className="text-gray-500 text-sm font-semibold uppercase">Total Retur</h3>
            <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalReturn)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm font-semibold uppercase">Total Bersih (Net)</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalNet)}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. PO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pembelian</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Retur</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Netto</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(item.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {item.poNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.supplierName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.items}>
                                {item.items}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                {formatCurrency(item.purchaseAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                                {item.returnAmount > 0 ? `(${formatCurrency(item.returnAmount)})` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                {formatCurrency(item.netAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    item.status === 'COMPLETED' || item.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 
                                    item.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {item.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {filteredData.length === 0 && (
                        <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                Tidak ada data ditemukan.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}
