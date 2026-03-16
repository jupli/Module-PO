'use client'

import { useState, useEffect } from 'react'
import { createPayment, deletePayment } from '@/app/actions/payment'
import { useRouter } from 'next/navigation'

interface Payment {
  id: string
  amount: number
  date: string
  method: string
  reference?: string
  notes?: string
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  po: {
    id: string
    poNumber: string
    totalAmount: number
    payments?: any[]
  }
}

export default function PaymentModal({ isOpen, onClose, po }: PaymentModalProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('TRANSFER')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<any[]>([])

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = po.totalAmount - totalPaid

  useEffect(() => {
    if (isOpen && po.payments) {
      setPayments(po.payments)
    }
  }, [isOpen, po.payments])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return

    setLoading(true)
    try {
      const result = await createPayment({
        poId: po.id,
        amount: Number(amount),
        method,
        reference,
        notes
      })

      if (result.success) {
        setAmount('')
        setReference('')
        setNotes('')
        setPayments([...payments, result.payment])
        router.refresh()
      }
    } catch (error) {
      console.error(error)
      alert('Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return
    
    setLoading(true)
    try {
      const result = await deletePayment(id, po.id)
      if (result.success) {
        setPayments(payments.filter(p => p.id !== id))
        router.refresh()
      }
    } catch (error) {
      console.error(error)
      alert('Failed to delete payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Pembayaran PO: {po.poNumber}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Total Tagihan</p>
              <p className="font-bold text-lg">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(po.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sudah Dibayar</p>
              <p className="font-bold text-lg text-green-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sisa Tagihan</p>
              <p className="font-bold text-lg text-red-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(remaining)}
              </p>
            </div>
          </div>

          {/* Payment Form */}
          {remaining > 0 && (
            <form onSubmit={handleSubmit} className="mb-8 border-b pb-8">
              <h3 className="font-medium mb-4">Catat Pembayaran Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={remaining}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="CASH">Tunai</option>
                    <option value="CHECK">Cek / Giro</option>
                    <option value="CREDIT">Kartu Kredit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referensi (Opsional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="No. Bukti / Ref"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Catatan tambahan"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          )}

          {/* Payment History */}
          <div>
            <h3 className="font-medium mb-4">Riwayat Pembayaran</h3>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">Belum ada data pembayaran.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metode</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {new Date(p.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{p.method}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{p.reference || '-'}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(p.amount)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
