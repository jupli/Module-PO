'use client'

import { useRef, useState } from 'react'
import { uploadRequestExcel } from '@/app/actions/upload-request'
import { useRouter } from 'next/navigation'

export default function UploadRequestForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setIsUploading(true)
    try {
      const result = await uploadRequestExcel(formData)
      
      if (result.success) {
        alert(result.message)
        formRef.current?.reset()
        router.refresh()
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Terjadi kesalahan saat mengupload file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Upload Permintaan Baru (Excel)</h2>
      <form 
        ref={formRef}
        action={handleSubmit} 
        className="flex gap-4 items-end"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Excel (.xlsx)
          </label>
          <input
            type="file"
            name="file"
            accept=".xlsx, .xls"
            required
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
          />
        </div>
        <button
          type="submit"
          disabled={isUploading}
          className={`bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Proses...
            </>
          ) : (
            'Upload & Proses'
          )}
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2">
        *Pastikan format Excel sesuai template (Baris 1-3 Header, Data mulai baris 4).
      </p>
    </div>
  )
}
