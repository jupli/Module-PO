'use client'

import { useState } from 'react'
import { POStatus, PurchaseOrder as PrismaPO } from '@prisma/client'
import POStatusBadge from '../../components/POStatusBadge'
import POActions from '../../components/POActions'
import PaymentStatusBadge from '../../components/PaymentStatusBadge'
import PaymentModal from '../../components/PaymentModal'
import { movePurchaseOrderItem } from '../actions/move-item'

// Define a type for the PO that matches what comes from the server action/Prisma
type PurchaseOrder = PrismaPO & {
  supplier: {
    name: string
    id: string
  }
  items: any[]
  // @ts-ignore - Handle potential stale Prisma client types
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
  // @ts-ignore
  payments: any[]
}

export default function POList({ purchaseOrders, suppliers: allSuppliers }: { purchaseOrders: PurchaseOrder[], suppliers: any[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [selectedPOForPayment, setSelectedPOForPayment] = useState<PurchaseOrder | null>(null)
  
  // Move Item State
  const [movingItem, setMovingItem] = useState<{ id: string, name: string, poId: string, supplierId: string } | null>(null)
  const [targetSupplierId, setTargetSupplierId] = useState('')
  const [isMoving, setIsMoving] = useState(false)

  const handleMoveItem = async () => {
    if (!movingItem || !targetSupplierId) return
    setIsMoving(true)
    try {
        const result = await movePurchaseOrderItem(movingItem.id, targetSupplierId, movingItem.poId)
        if (result.success) {
            alert('Item berhasil dipindahkan')
            setMovingItem(null)
            setTargetSupplierId('')
        } else {
            alert('Gagal memindahkan item: ' + result.message)
        }
    } catch (error) {
        console.error(error)
        alert('Terjadi kesalahan saat memindahkan item')
    } finally {
        setIsMoving(false)
    }
  }

  // 1. Group POs by Date (YYYY-MM-DD)
  const groupedByDate = purchaseOrders.reduce((acc: Record<string, PurchaseOrder[]>, po: PurchaseOrder) => {
    const dateKey = new Date(po.date).toISOString().split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(po)
    return acc
  }, {} as Record<string, PurchaseOrder[]>)

  // Sort dates descending
  const dates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  // If a date is selected, get POs for that date
  const datePOs = selectedDate ? groupedByDate[selectedDate] : []

  // 2. Within Date, Group POs by Supplier Name
  const groupedBySupplier = datePOs.reduce((acc: Record<string, PurchaseOrder[]>, po: PurchaseOrder) => {
    const supplierName = po.supplier.name
    if (!acc[supplierName]) {
      acc[supplierName] = []
    }
    acc[supplierName].push(po)
    return acc
  }, {} as Record<string, PurchaseOrder[]>)

  const suppliers = Object.keys(groupedBySupplier).sort()

  // Format date helper
  const formatDateLabel = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // VIEW 3: PO Table (Date & Supplier Selected)
  if (selectedDate && selectedSupplier) {
    const supplierPOs = groupedBySupplier[selectedSupplier] || []
    return (
      <div>
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => setSelectedSupplier(null)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke {formatDateLabel(selectedDate)}
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <span className="text-gray-500 font-normal mr-2">{formatDateLabel(selectedDate)} /</span>
            <span className="flex items-center">
              <svg className="w-6 h-6 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              {selectedSupplier}
            </span>
          </h2>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. PO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Nilai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokumen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status PO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pembayaran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {supplierPOs.map((po: PurchaseOrder) => (
                <tr key={po.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">{po.poNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">{new Date(po.date).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 align-top">
                    <ul className="list-disc pl-4 space-y-2">
                      {po.items.map((item: any, idx: number) => (
                        <li key={idx}>
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-700">{item.product?.name || item.productId}</span>
                                <span className="text-gray-500 text-xs ml-1">({item.quantity} {item.product?.unit || 'unit'})</span>
                              </div>
                              <button
                                onClick={() => setMovingItem({
                                    id: item.id,
                                    name: item.product?.name || item.productId,
                                    poId: po.id,
                                    supplierId: po.supplier.id
                                })}
                                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Pindahkan ke Supplier Lain"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.unitPrice || 0)} x {item.quantity} 
                              <span className="font-bold ml-1 text-gray-700">
                                = {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.total || 0)}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">{po.items.length} items</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(po.totalAmount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                    {/* @ts-ignore */}
                    {po.documentPath ? (
                      <a 
                        // @ts-ignore
                        href={po.documentPath} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-800 flex items-center font-medium"
                      >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <POStatusBadge status={po.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <div className="flex flex-col items-start gap-2">
                      <PaymentStatusBadge status={po.paymentStatus || 'UNPAID'} />
                      <button
                        onClick={() => setSelectedPOForPayment(po)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Bayar
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                    <POActions po={po} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedPOForPayment && (
          <PaymentModal 
            isOpen={!!selectedPOForPayment} 
            onClose={() => setSelectedPOForPayment(null)} 
            po={selectedPOForPayment} 
          />
        )}

        {/* Move Item Modal */}
        {movingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Pindahkan Item</h3>
              <p className="mb-4 text-sm text-gray-600">
                Pindahkan item <span className="font-bold text-gray-800">{movingItem.name}</span> dari <span className="font-medium text-gray-700">{selectedSupplier}</span> ke supplier lain?
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Supplier Tujuan</label>
                <select
                  value={targetSupplierId}
                  onChange={(e) => setTargetSupplierId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {allSuppliers
                    .filter(s => s.id !== movingItem.supplierId)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  }
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setMovingItem(null); setTargetSupplierId(''); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={isMoving}
                >
                  Batal
                </button>
                <button
                  onClick={handleMoveItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  disabled={!targetSupplierId || isMoving}
                >
                  {isMoving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memindahkan...
                    </>
                  ) : (
                    'Pindahkan'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // VIEW 2: Supplier Folders (Date Selected)
  if (selectedDate) {
    return (
      <div>
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => setSelectedDate(null)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Daftar Tanggal
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDateLabel(selectedDate)}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplierName) => {
            const supplierPOs = groupedBySupplier[supplierName]
            const count = supplierPOs.length
            const totalValue = supplierPOs.reduce((sum: number, po: PurchaseOrder) => sum + Number(po.totalAmount), 0)
            
            // Determine Folder Color based on PO Statuses
            const hasPending = supplierPOs.some(po => po.status === 'PENDING')
            const isAllApproved = supplierPOs.every(po => ['APPROVED', 'KIRIM', 'RECEIVED'].includes(po.status))
            const isRejected = supplierPOs.every(po => po.status === 'REJECTED')
            
            let colorClass = 'bg-gray-100 text-gray-600' // Default
            if (hasPending) {
                colorClass = 'bg-yellow-100 text-yellow-600' // Pending
            } else if (isAllApproved) {
                colorClass = 'bg-green-100 text-green-600' // Approved
            } else if (isRejected) {
                colorClass = 'bg-red-100 text-red-600' // Rejected
            }

            return (
              <div 
                key={supplierName}
                onClick={() => setSelectedSupplier(supplierName)}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer flex flex-col items-center text-center group"
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${colorClass}`}>
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{supplierName}</h3>
                <p className="text-sm text-gray-500 mb-4">{count} Purchase Order</p>
                <div className="mt-auto w-full border-t pt-4">
                  <p className="text-xs text-gray-500 uppercase">Total Nilai</p>
                  <p className="font-bold text-green-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalValue)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // VIEW 1: Date Folders (Initial View)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dates.map((dateStr) => {
        const count = groupedByDate[dateStr].length
        // Calculate total value for this date
        const totalValue = groupedByDate[dateStr].reduce((sum: number, po: PurchaseOrder) => sum + Number(po.totalAmount), 0)
        
        return (
          <div 
            key={dateStr}
            onClick={() => setSelectedDate(dateStr)}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{formatDateLabel(dateStr)}</h3>
            <p className="text-sm text-gray-500 mb-4">{count} Purchase Order</p>
            <div className="mt-auto w-full border-t pt-4">
              <p className="text-xs text-gray-500 uppercase">Total Nilai</p>
              <p className="font-bold text-green-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalValue)}
                  </p>
            </div>
          </div>
        )
      })}
      
      {dates.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          Belum ada Purchase Order yang dibuat.
        </div>
      )}
    </div>
  )
}
