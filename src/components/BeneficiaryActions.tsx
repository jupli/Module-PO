'use client'

import { useTransition } from 'react'
import { deleteBeneficiariesByDate } from '@/app/actions/delete-beneficiary'

export default function BeneficiaryActions({ date }: { date: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('Apakah Anda yakin ingin menghapus data penerima manfaat untuk tanggal ini?')) return

    startTransition(async () => {
      const res = await deleteBeneficiariesByDate(date)
      if (!res.success) {
        alert(res.message)
      } else {
        alert('Data berhasil dihapus')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`px-3 py-1.5 text-xs font-medium rounded-md text-white 
        ${isPending ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
        transition-colors duration-200`}
    >
      {isPending ? 'Menghapus...' : 'Hapus'}
    </button>
  )
}
