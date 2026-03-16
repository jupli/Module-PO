'use client'

import { useState } from 'react'
import PurchaseOrderViewer, { PurchaseRequest } from '@/components/PurchaseOrderViewer'

export default function SubmissionClient({ requests, beneficiaries }: { requests: PurchaseRequest[], beneficiaries: any[] }) {
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow text-gray-500">
        Belum ada pengajuan pembelian yang siap diproses (Status: PROCESSED).
        <br />
        Silakan selesaikan input harga di menu "Pembelian Bahan".
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {requests.map((req) => (
          <div 
            key={req.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
            onClick={() => setSelectedRequest(req)}
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    PO: {formatDate(req.requestDate)}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{req.items.length} Item Barang</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                  req.status === 'REJECTED' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {req.status === 'REJECTED' ? 'DITOLAK' : 'SIAP CETAK'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Estimasi:</span>
                  <span className="font-bold text-gray-900">
                    Rp {req.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                {req.status === 'REJECTED' && req.rejectionReason && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                    Alasan: {req.rejectionReason}
                  </div>
                )}
                {req.notes && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Note: {req.notes}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {req.purchasingSign && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                      Signed: Purchasing
                    </span>
                  )}
                  {req.managerSign && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                      Signed: Manager
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-blue-600 font-medium group-hover:underline">Lihat Detail &rarr;</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Detail & Print Preview */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <PurchaseOrderViewer 
            request={selectedRequest} 
            onClose={() => setSelectedRequest(null)} 
            isModal={true} 
            beneficiaries={beneficiaries}
          />
        </div>
      )}
    </div>
  )
}
