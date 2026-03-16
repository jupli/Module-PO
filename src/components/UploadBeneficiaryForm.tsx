
'use client'

import { useRef, useState } from 'react'
import { uploadBeneficiaryData } from '@/app/actions/upload-beneficiary'

export default function UploadBeneficiaryForm() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleUpload = async (formData: FormData) => {
    setIsLoading(true)
    setMessage('')
    setIsError(false)

    try {
      const result = await uploadBeneficiaryData(formData)
      setMessage(result.message)
      setIsError(!result.success)
      
      if (result.success && fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setMessage('Terjadi kesalahan saat mengupload file.')
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Upload Penerima Manfaat (Excel)</h2>
      
      <form action={handleUpload} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Excel (.xlsx)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".xlsx, .xls"
            required
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isLoading ? 'Memproses...' : 'Upload & Proses'}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          *Pastikan format Excel sesuai template (Ada Tanggal, Kategori, Header Penerima Manfaat).
        </div>
      </form>
    </div>
  )
}
