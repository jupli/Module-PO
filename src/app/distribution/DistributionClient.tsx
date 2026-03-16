'use client'

import { useState } from 'react'
import { getDistributionItems, submitQC, shipItem } from '@/app/actions/distribution'
import { archiveDocument } from '@/app/actions/archive' // Reusing for file upload
import DistributionArchive from '@/components/DistributionArchive'

export default function DistributionPage({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState<'pending' | 'ready' | 'history'>('pending')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  
  // QC Form State
  const [qcBy, setQcBy] = useState('')
  const [qcNotes, setQcNotes] = useState('')
  const [qcFile, setQcFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Shipping Form State
  const [isShipping, setIsShipping] = useState(false)
  const [shippingItem, setShippingItem] = useState<any>(null)
  const [senderName, setSenderName] = useState('')
  const [destination, setDestination] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [shippedAt, setShippedAt] = useState('')
  
  // Signatures
  const [senderSignRef, setSenderSignRef] = useState<HTMLCanvasElement | null>(null)

  const pendingItems = items.filter((i: any) => i.status === 'PENDING_QC')
  const readyItems = items.filter((i: any) => i.status === 'READY_TO_SHIP')
  const historyItems = items.filter((i: any) => ['SHIPPED', 'REJECTED'].includes(i.status))

  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineWidth = 2
      ctx.strokeStyle = '#000'
      ctx.lineCap = 'round'
    }
  }

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  // Simple drawing logic for canvas
  const startDrawing = (e: any, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvas.dataset.drawing = 'true'
  }

  const draw = (e: any, canvas: HTMLCanvasElement | null) => {
    if (!canvas || canvas.dataset.drawing !== 'true') return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    canvas.dataset.drawing = 'false'
  }

  const handleQCSubmit = async (status: 'PASS' | 'REJECT') => {
    if (!selectedItem || !qcBy) return
    setIsSubmitting(true)

    try {
      let photoUrl = ''
      
      if (qcFile) {
        const formData = new FormData()
        formData.append('file', qcFile)
        formData.append('date', new Date().toISOString().split('T')[0])
        formData.append('filename', `QC-${selectedItem.id}-${Date.now()}.jpg`)
        
        const uploadRes = await archiveDocument(formData)
        if (uploadRes.success) {
          photoUrl = uploadRes.path!
        }
      }

      const res = await submitQC(selectedItem.id, {
        status,
        qcBy,
        notes: qcNotes,
        photoUrl
      })

      if (res.success) {
        // Optimistic update or refresh
        window.location.reload()
      } else {
        alert('Failed to submit QC')
      }
    } catch (error) {
      console.error(error)
      alert('Error during QC submission')
    } finally {
      setIsSubmitting(false)
      setSelectedItem(null)
      setQcFile(null)
      setQcNotes('')
      setQcBy('')
      setPreviewUrl(null)
    }
  }

  const openShippingModal = (item: any) => {
    setShippingItem(item)
    setIsShipping(true)
    setShippedAt(new Date().toISOString().slice(0, 16)) // Default to now
    setDestination(item.destination || '') // Set destination from item field
  }

  const handleShipSubmit = async () => {
    if (!shippingItem || !senderName || !receiverName) {
      alert('Mohon lengkapi data pengirim dan penerima')
      return
    }

    if (!senderSignRef) return

    setIsSubmitting(true)
    try {
        const senderSign = senderSignRef.toDataURL()
        
        const res = await shipItem(shippingItem.id, {
            senderName,
            destination,
            receiverName,
            arrivalTime: '',
            shippedAt: new Date(shippedAt),
            senderSign,
            receiverSign: ''
        })

        if (res.success) {
            window.location.reload()
        } else {
            alert('Gagal mengirim item')
        }
    } catch (error) {
        console.error(error)
        alert('Terjadi kesalahan')
    } finally {
        setIsSubmitting(false)
        setIsShipping(false)
        setShippingItem(null)
    }
  }

  const handleShip = async (id: string) => {
    // Legacy simple ship - not used anymore
    if (confirm('Konfirmasi pengiriman menu ini?')) {
      const res = await shipItem(id)
      if (res.success) {
        window.location.reload()
      } else {
        alert('Gagal mengirim item')
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Distribusi & Quality Control</h1>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
            activeTab === 'pending'
              ? 'bg-white text-blue-700 shadow'
              : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-800'
          }`}
        >
          Menunggu QC ({pendingItems.length})
        </button>
        <button
          onClick={() => setActiveTab('ready')}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
            activeTab === 'ready'
              ? 'bg-white text-blue-700 shadow'
              : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-800'
          }`}
        >
          Siap Kirim ({readyItems.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
            activeTab === 'history'
              ? 'bg-white text-blue-700 shadow'
              : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-800'
          }`}
        >
          Riwayat Pengiriman
        </button>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Pending QC Tab */}
        {activeTab === 'pending' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penerima</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Porsi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foto Paket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu Masak</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Tidak ada antrian QC</td>
                </tr>
              ) : (
                pendingItems.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.menuName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.destination || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity} porsi</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-400">(Upload di QC)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.cookDate).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Proses QC
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Ready to Ship Tab */}
        {activeTab === 'ready' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tujuan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QC Oleh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foto Paket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {readyItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Tidak ada item siap kirim</td>
                </tr>
              ) : (
                readyItems.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.menuName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.destination || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.qcBy}<br/>
                      <span className="text-xs text-gray-400">{new Date(item.qcDate).toLocaleString('id-ID')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.photoUrl ? (
                        <a href={item.photoUrl} target="_blank" className="text-blue-600 hover:underline">Lihat Foto</a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openShippingModal(item)}
                        className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm"
                      >
                        Kirim Sekarang
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <DistributionArchive historyItems={historyItems} />
        )}
      </div>

      {/* Shipping Modal */}
      {isShipping && shippingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity" 
            onClick={() => {
              setIsShipping(false)
              setShippingItem(null)
            }}
          ></div>
          
          <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all w-full max-w-3xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Form Pengiriman: {shippingItem.menuName}</h2>
              <button 
                onClick={() => {
                  setIsShipping(false)
                  setShippingItem(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                {/* Left Column: Sender Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-blue-800 border-b border-blue-100 pb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Data Pengiriman
                  </h3>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Nama Petugas Pengiriman</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Nama Pengirim"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Tanggal Pickup</label>
                    <input
                      type="datetime-local"
                      value={shippedAt}
                      onChange={(e) => setShippedAt(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Tujuan Pengiriman</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Banyaknya Porsi</label>
                    <input
                      type="text"
                      value={shippingItem.quantity + ' Porsi'}
                      readOnly
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>

                {/* Right Column: Receiver Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-green-800 border-b border-green-100 pb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Data Penerima
                  </h3>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Nama Penerima</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Nama Penerima"
                    />
                  </div>

                  {shippingItem.photoUrl && (
                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-1">Foto Paket</label>
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={shippingItem.photoUrl} 
                          alt="Foto Paket" 
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Signatures */}
              <div className="mt-6">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Tanda Tangan Pengirim</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 h-40 relative hover:border-blue-400 transition-colors">
                    <canvas
                      ref={(ref) => {
                          setSenderSignRef(ref)
                          if (ref) initCanvas(ref)
                      }}
                      width={320}
                      height={160}
                      onMouseDown={(e) => startDrawing(e, senderSignRef)}
                      onMouseMove={(e) => draw(e, senderSignRef)}
                      onMouseUp={() => stopDrawing(senderSignRef)}
                      onMouseLeave={() => stopDrawing(senderSignRef)}
                      onTouchStart={(e) => startDrawing(e, senderSignRef)}
                      onTouchMove={(e) => draw(e, senderSignRef)}
                      onTouchEnd={() => stopDrawing(senderSignRef)}
                      className="w-full h-full cursor-crosshair touch-none rounded-lg"
                    />
                    <button 
                      onClick={() => clearCanvas(senderSignRef)}
                      className="absolute bottom-2 right-2 text-xs text-red-600 hover:text-red-700 bg-white/90 px-3 py-1.5 rounded-md border shadow-sm font-medium transition-all hover:shadow"
                    >
                      Hapus Tanda Tangan
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">Petugas Pengiriman</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsShipping(false)
                  setShippingItem(null)
                  setSenderName('')
                  setReceiverName('')
                  setDestination('')
                }}
                className="px-5 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                onClick={handleShipSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-blue-600/30 transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </span>
                ) : 'Konfirmasi Pengiriman'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QC Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Quality Control: {selectedItem.menuName}</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Nama Staff QC
              </label>
              <input
                type="text"
                value={qcBy}
                onChange={(e) => setQcBy(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Nama Anda"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Foto Paket Makanan
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setQcFile(file)
                    setPreviewUrl(URL.createObjectURL(file))
                  } else {
                    setQcFile(null)
                    setPreviewUrl(null)
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {previewUrl && (
                <div className="mt-2">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Catatan
              </label>
              <textarea
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={3}
                placeholder="Kondisi makanan, kemasan, dll..."
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setQcFile(null)
                  setPreviewUrl(null)
                  setQcNotes('')
                  setQcBy('')
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-1/3"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                onClick={() => handleQCSubmit('REJECT')}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-1/3"
                disabled={isSubmitting}
              >
                Reject
              </button>
              <button
                onClick={() => handleQCSubmit('PASS')}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-1/3"
                disabled={isSubmitting}
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
