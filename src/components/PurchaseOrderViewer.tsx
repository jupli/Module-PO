'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import dynamic from 'next/dynamic'
import { saveSignature } from '@/app/actions/signature'
import { rejectPurchaseRequest } from '@/app/actions/reject'
import type SignatureCanvas from 'react-signature-canvas'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SignatureCanvasComponent = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any

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

export interface PurchaseRequest {
  id: string
  requestDate: string
  notes: string | null
  status: string
  rejectionReason?: string | null
  items: PurchaseRequestItem[]
  purchasingSign?: string | null
  managerSign?: string | null
}

type SignRole = 'purchasing' | 'manager'

interface PurchaseOrderViewerProps {
  request: PurchaseRequest
  onClose?: () => void
  isModal?: boolean
  showShareButton?: boolean
  beneficiaries?: any[]
}

import { generatePurchaseOrders } from '@/app/actions/po-generator'

export default function PurchaseOrderViewer({ request, onClose, isModal = false, showShareButton = true, beneficiaries = [] }: PurchaseOrderViewerProps) {
  const router = useRouter()
  const [activePage, setActivePage] = useState<1 | 2>(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [signingRole, setSigningRole] = useState<SignRole | null>(null)
  const [signatures, setSignatures] = useState<Record<SignRole, string | null>>({
    purchasing: request.purchasingSign || null,
    manager: request.managerSign || null
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // Rejection state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  
  const printRef = useRef<HTMLDivElement>(null)
  const sigPad = useRef<any>(null)

  // Update local state if props change (e.g. from server revalidation)
  useEffect(() => {
    setSignatures({
      purchasing: request.purchasingSign || null,
      manager: request.managerSign || null
    })
  }, [request.purchasingSign, request.managerSign])

  // Filter beneficiaries for the same date as the request
  const relevantBeneficiaries = beneficiaries.filter(b => {
    const bDate = typeof b.date === 'string' ? b.date : new Date(b.date).toISOString()
    const reqDate = typeof request.requestDate === 'string' ? request.requestDate : new Date(request.requestDate).toISOString()
    return bDate.split('T')[0] === reqDate.split('T')[0]
  })

  // Group by category
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupedBeneficiaries = relevantBeneficiaries.reduce((acc: Record<string, any[]>, b) => {
    const cat = b.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  // Sort categories
  const sortedCategories = Object.keys(groupedBeneficiaries).sort((a, b) => {
    const order = ['PM PAKET BASAH', 'PM PAKET KERING', 'Bumil/Balita'];
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const grandTotalPM = relevantBeneficiaries.reduce((sum, b) => sum + b.total, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handlePrint = async () => {
    if (!printRef.current) return

    try {
      setIsGenerating(true)
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByClassName('hide-on-print')
          Array.from(elements).forEach((el) => {
            (el as HTMLElement).style.display = 'none'
          })
        }
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`PO-${request.requestDate.split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Gagal membuat PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/share/po/${request.id}`
    navigator.clipboard.writeText(url)
      .then(() => alert('Link berhasil disalin! Silakan bagikan kepada Manager atau Purchasing untuk tanda tangan.'))
      .catch(() => alert('Gagal menyalin link'))
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Mohon isi alasan penolakan')
      return
    }

    try {
      setIsRejecting(true)
      const result = await rejectPurchaseRequest(request.id, rejectionReason)
      
      if (result.success) {
        alert('Purchase Order berhasil ditolak')
        setShowRejectModal(false)
        router.refresh()
        if (onClose) {
          onClose()
        }
      } else {
        alert('Gagal menolak Purchase Order')
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Terjadi kesalahan saat menolak')
    } finally {
      setIsRejecting(false)
    }
  }

  const openSignatureModal = (role: SignRole) => {
    setSigningRole(role)
  }

  const handleSaveSignature = async () => {
    if (!signingRole || !sigPad.current || sigPad.current.isEmpty()) return
    
    setIsSaving(true)
    const dataUrl = sigPad.current.toDataURL()
    
    // Optimistic update
    setSignatures(prev => ({ ...prev, [signingRole]: dataUrl }))
    
    // Save to DB
    try {
      const result = await saveSignature(request.id, signingRole, dataUrl)
      
      if (result.success) {
        setSigningRole(null)
      } else {
        alert('Gagal menyimpan tanda tangan')
        // Revert optimistic update
        setSignatures(prev => ({ ...prev, [signingRole]: null }))
      }
    } catch (error) {
      console.error('Error saving signature:', error)
      alert('Gagal menyimpan tanda tangan')
      setSignatures(prev => ({ ...prev, [signingRole]: null }))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitShare = async () => {
    if (confirm('Apakah Anda yakin ingin mengirim dokumen ini? Sistem akan otomatis membuat Draft PO untuk setiap Supplier.')) {
      try {
        setIsGenerating(true)
        const result = await generatePurchaseOrders(request.id)
        
        if (result.success) {
          alert(result.message)
          if (onClose) {
            onClose()
          } else {
            setIsSubmitted(true)
          }
          router.refresh()
        } else {
          alert(result.message)
        }
      } catch (error) {
        console.error('Error processing request:', error)
        alert('Terjadi kesalahan saat memproses permintaan')
      } finally {
        setIsGenerating(false)
      }
    }
  }

  const clearSignature = async (role: SignRole) => {
     if (confirm('Hapus tanda tangan?')) {
      try {
        setIsSaving(true)
        // Also clear from server
        const result = await saveSignature(request.id, role, '') // Empty string to clear
        
        if (result.success) {
          setSignatures(prev => ({
            ...prev,
            [role]: null
          }))
          router.refresh()
        } else {
          alert('Gagal menghapus tanda tangan')
        }
      } catch (error) {
        console.error('Error clearing signature:', error)
        alert('Terjadi kesalahan saat menghapus tanda tangan')
      } finally {
        setIsSaving(false)
      }
     }
  }

  const [isWindowClosed, setIsWindowClosed] = useState(false)
  
  const handleCloseWindow = () => {
    try {
      window.close()
    } catch (e) {
      console.log('Window close prevented by browser', e)
    }
    // Fallback: If window doesn't close (likely), show "Closed" UI
    setIsWindowClosed(true)
  }

  if (isWindowClosed) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white p-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Selesai</h1>
          <p className="text-xl text-gray-300">Anda aman untuk menutup tab browser ini sekarang.</p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-white rounded-xl shadow-lg p-8 text-center max-w-2xl mx-auto my-8">
        <div className="bg-green-100 p-6 rounded-full mb-6 animate-bounce">
          <svg className="w-20 h-20 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Terima Kasih!</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-md">
          Tanda tangan Anda telah berhasil disimpan dan dokumen Purchase Order telah terupdate secara otomatis.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {onClose ? (
            <button 
              onClick={onClose}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Tutup
            </button>
          ) : (
            <button 
              onClick={handleCloseWindow}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Tutup
            </button>
          )}
          <p className="text-sm text-gray-400 mt-2">
            *Jika browser tidak tertutup otomatis, silakan tutup tab secara manual.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${isModal ? 'rounded-xl overflow-hidden shadow-2xl w-full max-w-4xl h-[90vh]' : ''}`}>
      {/* Header Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              Preview Purchase Order
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 ml-9">
              {request.status === 'REJECTED' ? 'Dokumen ini telah ditolak' : 'Pastikan data sudah benar sebelum dicetak'}
            </p>
          </div>
          <div className="flex gap-3">
            {request.status !== 'REJECTED' && showShareButton && signatures.purchasing && !signatures.manager && (
              <button 
                onClick={handleShare}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Link
              </button>
            )}
            
            {!showShareButton && request.status !== 'REJECTED' && signatures.manager && signatures.purchasing && (
              <button 
                onClick={handleSubmitShare}
                disabled={isGenerating}
                className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors flex items-center gap-2 ${isGenerating ? 'opacity-70 cursor-not-allowed' : 'animate-pulse'}`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Proses PO
                  </>
                )}
              </button>
            )}

            {/* Show Process Button even in internal view if fully signed but not processed */}
            {showShareButton && request.status !== 'REJECTED' && request.status !== 'PROCESSED' && signatures.manager && signatures.purchasing && (
              <button 
                onClick={handleSubmitShare}
                disabled={isGenerating}
                className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors flex items-center gap-2 ${isGenerating ? 'opacity-70 cursor-not-allowed' : 'animate-pulse'}`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Buat PO Otomatis
                  </>
                )}
              </button>
            )}

            {isModal && onClose && (
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-gray-100">
          <button 
            onClick={() => setActivePage(1)} 
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activePage === 1 ? 'bg-gray-100 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Proposal Pengajuan
          </button>
          <button 
            onClick={() => setActivePage(2)} 
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activePage === 2 ? 'bg-gray-100 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Purchase Order
          </button>
        </div>
      </div>

      {request.status === 'REJECTED' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Purchase Order Ditolak
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Alasan: {request.rejectionReason || 'Tidak ada alasan'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto p-6 bg-gray-100 ${isModal ? 'max-h-[calc(90vh-140px)]' : ''}`}>
        {/* Printable Area */}
        <div ref={printRef} className="bg-white p-8 shadow-sm mx-auto max-w-2xl min-h-[800px] relative" id="invoice-area">
          {request.status === 'REJECTED' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                DITOLAK
              </div>
              {request.rejectionReason && (
                <p className="text-sm text-red-600 ml-7">
                  Alasan: {request.rejectionReason}
                </p>
              )}
            </div>
          )}

          {activePage === 1 ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wider mb-2">PROPOSAL PENGAJUAN PEMBELIAN BAHAN MAKANAN</h1>
                <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider mb-2">PROGRAM MBG (MAKAN BERGIZI)</h2>
                <p className="text-sm text-gray-500">Tanggal: {formatDate(request.requestDate)}</p>
              </div>

              <div className="mb-6 text-sm text-gray-700 text-justify leading-relaxed">
                <p className="mb-4">
                  Dalam rangka mendukung pelaksanaan Program MBG (Makan Bergizi) guna meningkatkan pemenuhan gizi peserta didik, guru dan tenaga kependidikan (GTK), serta kelompok rentan di masyarakat, maka diperlukan penyediaan bahan makanan yang cukup, bergizi, dan berkualitas.
                </p>
                <p>
                  Kegiatan ini akan dilaksanakan pada <strong>{formatFullDate(relevantBeneficiaries[0]?.date || request.requestDate)}</strong>, dengan sasaran penerima manfaat yang terdiri dari peserta didik dari berbagai jenjang pendidikan, serta kelompok masyarakat yaitu ibu hamil/ibu menyusui (Bumil/Busui) dan balita.
                </p>
              </div>

              <div className="space-y-8">
                {sortedCategories.map((category) => {
                  const items = groupedBeneficiaries[category];
                  const totalSum = items.reduce((sum, b) => sum + b.total, 0);
                  const smallSum = items.reduce((sum, b) => sum + (b.portionSmall || 0), 0);
                  const largeSum = items.reduce((sum, b) => sum + (b.portionLarge || 0), 0);
                  
                  const isBumil = category === 'Bumil/Balita';
                  const dateStr = items[0]?.date ? formatFullDate(items[0].date) : '';

                  return (
                    <div key={category} className="break-inside-avoid">
                        <div className="mb-2 font-bold text-gray-700">
                            <div>{dateStr}</div>
                            {category !== 'Bumil/Balita' && <div className="uppercase">{category}</div>}
                        </div>
                        
                        <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                            {isBumil ? (
                                <>
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-300 px-4 py-2 text-left" rowSpan={2}>Penerima Manfaat</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center" colSpan={3}>Porsi</th>
                                        </tr>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-300 px-4 py-2 text-center">Bumil/Busui</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Balita</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((b, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-gray-300 px-4 py-2 font-medium">{b.name}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{b.portionSmall}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{b.portionLarge}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{b.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="border border-gray-300 px-4 py-2">JUMLAH</td>
                                            <td className="border border-gray-300 px-4 py-2 text-center">{smallSum}</td>
                                            <td className="border border-gray-300 px-4 py-2 text-center">{largeSum}</td>
                                            <td className="border border-gray-300 px-4 py-2 text-center">{totalSum}</td>
                                        </tr>
                                    </tfoot>
                                </>
                            ) : (
                                <>
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-300 px-4 py-2 text-left" rowSpan={2}>Penerima Manfaat</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center" rowSpan={2}>Jumlah Siswa + GTK</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center" colSpan={2}>Porsi</th>
                                        </tr>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-300 px-4 py-2 text-center">kecil</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Besar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((b, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-gray-300 px-4 py-2 font-medium">{b.name}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{b.total}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{b.portionSmall}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{b.portionLarge}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                         <tr className="bg-gray-100 font-bold">
                                             <td className="border border-gray-300 px-4 py-2">
                                                 {category.toUpperCase().includes('KERING') ? 'JUMLAH SISWA' : 'JUMLAH PM'}
                                             </td>
                                             <td className="border border-gray-300 px-4 py-2 text-center">{totalSum}</td>
                                             <td className="border border-gray-300 px-4 py-2 text-center">{smallSum}</td>
                                            <td className="border border-gray-300 px-4 py-2 text-center">{largeSum}</td>
                                        </tr>
                                    </tfoot>
                                </>
                            )}
                        </table>
                    </div>
                  );
                })}

                <div className="mt-8 pt-4 border-t-2 border-gray-300 flex justify-between items-center font-bold text-xl text-gray-900 px-4">
                   <span>TOTAL PM</span>
                   <span>{grandTotalPM}</span>
                 </div>

                 {sortedCategories.length === 0 && (
                    <div className="text-center text-gray-500 py-8 italic border border-dashed border-gray-300 rounded-lg">
                        Tidak ada data penerima manfaat untuk tanggal ini.
                    </div>
                 )}
               </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider mb-2">Purchase Order</h1>
                <p className="text-sm text-gray-500">Tanggal: {formatDate(request.requestDate)}</p>
                <p className="text-sm text-gray-500">ID: {request.id.slice(-8).toUpperCase()}</p>
              </div>

              <div className="mb-8 border-b border-gray-200 pb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Daftar Barang</h3>
                {(() => {
                  // Group items by name to combine quantities (Large + Small + Buffer)
                  // Logic:
                  // 1. Group items by itemName
                  // 2. Sum up quantity for each group
                  // 3. Use the price from any item (assuming same price per item type)
                  // 4. Use unit from any item
                  
                  const groupedByName = request.items.reduce((acc, item) => {
                    const key = item.itemName.trim().toLowerCase();
                    if (!acc[key]) {
                      acc[key] = {
                        ...item,
                        quantity: 0, // Reset quantity to sum it up
                        // Keep other fields like unit, price, category
                      };
                    }
                    acc[key].quantity += item.quantity;
                    return acc;
                  }, {} as Record<string, typeof request.items[0]>);

                  const consolidatedItems = Object.values(groupedByName);

                  return (
                    <div className="space-y-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left">
                            <th className="py-2 font-medium text-gray-700">Item</th>
                            <th className="py-2 font-medium text-gray-700 text-right">Kategori</th>
                            <th className="py-2 font-medium text-gray-700 text-right">Qty Total</th>
                            <th className="py-2 font-medium text-gray-700 text-right">Harga Satuan</th>
                            <th className="py-2 font-medium text-gray-700 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {consolidatedItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-3 text-gray-800 font-medium">
                                {item.itemName}
                              </td>
                              <td className="py-3 text-right text-gray-500">
                                {item.category || '-'}
                              </td>
                              <td className="py-3 text-right text-gray-600 font-bold">
                                {item.quantity.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {item.unit}
                              </td>
                              <td className="py-3 text-right text-gray-600">
                                Rp {item.price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="py-3 text-right font-bold text-gray-900">
                                Rp {(item.quantity * item.price).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                
                <div className="mt-8 border-t border-gray-200 pt-4 flex justify-end items-center gap-4">
                  <span className="font-medium text-gray-600">Total Estimasi Pembelian:</span>
                  <span className="font-bold text-blue-600 text-xl">
                    Rp {request.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="text-center relative">
              <p className="text-sm font-medium text-gray-500 mb-4">Dibuat Oleh,</p>
              
              <div className="h-32 flex items-center justify-center relative group">
                {signatures.purchasing ? (
                  <div className="relative group w-full h-full flex items-center justify-center">
                    <img src={signatures.purchasing} alt="Signature" className="max-h-full max-w-full" />
                    {request.status !== 'REJECTED' && showShareButton && (
                      <button 
                        onClick={() => clearSignature('purchasing')}
                        className="absolute top-0 right-0 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hide-on-print"
                        title="Hapus Tanda Tangan"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  request.status !== 'REJECTED' && showShareButton && (
                    <button
                      onClick={() => openSignatureModal('purchasing')}
                      className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors hide-on-print"
                    >
                      + Tanda Tangan
                    </button>
                  )
                )}
              </div>

              <div className="border-t border-gray-300 w-32 mx-auto mt-2"></div>
              <p className="text-sm text-gray-900 mt-2">Purchasing</p>
            </div>

            <div className="text-center relative">
              <p className="text-sm font-medium text-gray-500 mb-4">Disetujui Oleh,</p>
              
              <div className="h-32 flex items-center justify-center relative group">
                {signatures.manager ? (
                  <div className="relative group w-full h-full flex items-center justify-center">
                    <img src={signatures.manager} alt="Signature" className="max-h-full max-w-full" />
                    {request.status !== 'REJECTED' && !showShareButton && (
                      <button 
                        onClick={() => clearSignature('manager')}
                        className="absolute top-0 right-0 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hide-on-print"
                        title="Hapus Tanda Tangan"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  request.status !== 'REJECTED' && !showShareButton && signatures.purchasing && (
                    <button
                      onClick={() => openSignatureModal('manager')}
                      className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors hide-on-print"
                    >
                      + Tanda Tangan
                    </button>
                  )
                )}
              </div>

              <div className="border-t border-gray-300 w-32 mx-auto mt-2"></div>
              <p className="text-sm text-gray-900 mt-2">Manager</p>
            </div>
          </div>
        </>
      )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
        <div>
          {request.status !== 'REJECTED' && (
            <button 
              onClick={() => setShowRejectModal(true)}
              className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tolak PO
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Tutup
            </button>
          )}
          <button 
            onClick={handlePrint}
            disabled={isGenerating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">
                Tolak Purchase Order
              </h3>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4 text-sm">
                Apakah Anda yakin ingin menolak Purchase Order ini? Silakan berikan alasan penolakan.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none h-32 text-sm"
                placeholder="Contoh: Harga terlalu mahal, stok masih ada, dll."
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-70 font-medium flex items-center gap-2"
              >
                {isRejecting ? 'Memproses...' : 'Tolak PO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {signingRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">
                Tanda Tangan: {signingRole === 'purchasing' ? 'Purchasing' : 'Manager'}
              </h3>
              <button 
                onClick={() => setSigningRole(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-white">
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 touch-none">
                <SignatureCanvasComponent 
                  ref={sigPad}
                  canvasProps={{
                    className: 'w-full h-48 cursor-crosshair',
                    width: 400,
                    height: 192
                  }}
                  backgroundColor="rgba(0,0,0,0)"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Goreskan tanda tangan di area kotak di atas
              </p>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={() => sigPad.current?.clear()}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Hapus
              </button>
              <button
                onClick={handleSaveSignature}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
