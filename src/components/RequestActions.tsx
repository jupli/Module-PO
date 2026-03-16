'use client'

import { useState, useTransition } from 'react'
import { deleteRequest, processRequest } from '@/app/actions/request'

interface RequestActionsProps {
  requestId: string
  currentStatus: string
}

export default function RequestActions({ requestId, currentStatus }: RequestActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus permintaan ini?')) return
    
    setLoadingAction('delete')
    startTransition(async () => {
      const res = await deleteRequest(requestId)
      if (!res.success) {
        alert(res.message)
      }
      setLoadingAction(null)
    })
  }

  const handleProcess = async () => {
    if (!confirm('Apakah Anda yakin ingin memproses permintaan ini? Status akan berubah menjadi APPROVED.')) return

    setLoadingAction('process')
    startTransition(async () => {
      const res = await processRequest(requestId)
      if (!res.success) {
        alert(res.message)
      }
      setLoadingAction(null)
    })
  }

  const isProcessed = currentStatus === 'APPROVED' || currentStatus === 'PROCESSED'

  return (
    <div className="flex space-x-2">
      {!isProcessed && (
        <button
          onClick={handleProcess}
          disabled={isPending}
          className={`px-3 py-1.5 text-xs font-medium rounded-md text-white 
            ${isPending ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
            transition-colors duration-200`}
        >
          {loadingAction === 'process' ? 'Memproses...' : 'Proses'}
        </button>
      )}
      
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={`px-3 py-1.5 text-xs font-medium rounded-md text-white 
          ${isPending ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
          transition-colors duration-200`}
      >
        {loadingAction === 'delete' ? 'Menghapus...' : 'Hapus'}
      </button>
    </div>
  )
}
