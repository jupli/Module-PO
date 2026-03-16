'use client'

import { useState, useEffect } from 'react'
import { getDailyCookingData, processDailyUsage } from '@/app/actions/daily-cooking'
import { useRouter } from 'next/navigation'

// Simple Calendar Implementation
const Calendar = ({ selectedDate, onDateSelect }: { selectedDate: Date, onDateSelect: (date: Date) => void }) => {
    const today = new Date()
    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
    
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() // 0 = Sunday
    
    // Adjust for Monday start if needed, but standard Sunday start is fine for now
    
    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }
    
    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }

    const renderDays = () => {
        const days = []
        // Empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>)
        }
        
        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
            const isSelected = date.toDateString() === selectedDate.toDateString()
            const isToday = date.toDateString() === today.toDateString()
            
            days.push(
                <button
                    key={i}
                    onClick={() => onDateSelect(date)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm transition-all
                        ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md transform scale-110' : 'hover:bg-blue-100 text-gray-700'}
                        ${isToday && !isSelected ? 'border-2 border-blue-400 text-blue-600 font-bold' : ''}
                    `}
                >
                    {i}
                </button>
            )
        }
        return days
    }

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h3 className="font-bold text-gray-800 text-lg">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, idx) => (
                    <div key={idx} className="text-xs font-bold text-gray-400 uppercase">{day}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2 justify-items-center">
                {renderDays()}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
                 <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded-full border-2 border-blue-400"></div> Hari Ini
                    <div className="w-3 h-3 rounded-full bg-blue-600 ml-2"></div> Terpilih
                 </div>
            </div>
        </div>
    )
}

export default function DailyCookingView() {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<any>(null)

    const handleSubmitData = async () => {
        if (!data || !data.items || data.items.length === 0) return
        
        // 1. Check for insufficient stock
        // Use a small epsilon for floating point comparison to avoid issues where 21.067 < 21.06700000001
        const EPSILON = 0.0001;
        const insufficientItems = data.items.filter((item: any) => {
            const stock = item.stock || 0;
            // If stock is less than quantity AND the difference is significant (larger than epsilon)
            return stock < item.quantity && (item.quantity - stock) > EPSILON;
        })
        
        if (insufficientItems.length > 0) {
            const itemsList = insufficientItems.map((i: any) => 
                `- ${i.name}: Butuh ${new Intl.NumberFormat('id-ID').format(i.quantity)} ${i.unit}, Stok ${new Intl.NumberFormat('id-ID').format(i.stock || 0)} ${i.unit}`
            ).join('\n')
            
            alert(`GAGAL: Stok bahan berikut TIDAK MENCUKUPI:\n\n${itemsList}\n\nMohon lakukan penerimaan barang atau update stok terlebih dahulu sebelum submit.`)
            return
        }

        const confirmMessage = `Anda akan memproses ${data.items.length} bahan untuk tanggal ${data.date}.\nStok akan dikurangi otomatis. Lanjutkan?`

        if (!confirm(confirmMessage)) {
            return
        }

        setSubmitting(true)
        try {
            const result = await processDailyUsage(data.date, data.items)
            if (result.success && result.data) {
                alert(`Berhasil! ${result.data.processed.length} bahan diproses. ${result.data.skipped.length > 0 ? result.data.skipped.length + ' bahan dilewati (tidak ditemukan).' : ''}`)
                // Refresh data
                fetchData(selectedDate)
                router.refresh()
            } else {
                alert('Gagal memproses: ' + (result.error || 'Terjadi kesalahan'))
            }
        } catch (error) {
            console.error(error)
            alert('Terjadi kesalahan sistem')
        } finally {
            setSubmitting(false)
        }
    }

    // Initial load
    useEffect(() => {
        fetchData(new Date())
    }, [])

    async function fetchData(date: Date) {
        setLoading(true)
        // Adjust date to local string YYYY-MM-DD
        // Note: toISOString() uses UTC, we want local date part
        const offset = date.getTimezoneOffset()
        const localDate = new Date(date.getTime() - (offset*60*1000))
        const dateStr = localDate.toISOString().split('T')[0]
        
        try {
            const result = await getDailyCookingData(dateStr)
            if (result.success) {
                setData(result.data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date)
        fetchData(date)
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-100px)]">
            {/* Left Column: Calendar & Operations */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg">
                    <h2 className="text-xl font-bold mb-1">Jadwal Operasional</h2>
                    <p className="text-blue-100 text-sm opacity-90">Pilih tanggal untuk melihat menu & kebutuhan.</p>
                </div>
                
                <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
                
                {/* Summary Card (Optional) */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status Hari Ini
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tanggal</span>
                            <span className="font-medium">{selectedDate.toLocaleDateString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                             <span className="text-gray-500">Total PM</span>
                             <span className="font-bold text-blue-600">{data?.totalBeneficiaries || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Details */}
            <div className="w-full lg:w-2/3">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{formatDate(selectedDate)}</h2>
                            <p className="text-gray-500 text-sm mt-1">Daftar Bahan Makanan & Porsi</p>
                        </div>
                        <div className="text-right">
                             <div className="text-3xl font-bold text-blue-600">{data?.totalBeneficiaries || 0}</div>
                             <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Penerima Manfaat</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow flex flex-col">
                        {loading ? (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400 animate-pulse p-6">
                                <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                                <p>Memuat data...</p>
                            </div>
                        ) : (
                            <>
                                {/* Ingredients Section - White Background */}
                                <div className="p-6 bg-white">
                                    {(!data?.items || data.items.length === 0) && (
                                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            <p className="text-lg font-medium">Tidak ada data bahan tercatat</p>
                                            <p className="text-sm mt-2">Pilih tanggal lain yang memiliki jadwal Request/Menu.</p>
                                        </div>
                                    )}

                                    {data?.items && data.items.length > 0 && (
                                        <div className="space-y-6">
                                            {/* Group Items by Category if possible, or just list them nicely */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {data.items.map((item: any, idx: number) => (
                                                    <div key={idx} className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center group ${item.stock <= 0 ? 'bg-red-100' : 'bg-white'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm
                                                                ${item.category === 'Bahan Basah' ? 'bg-green-100 text-green-600' : 
                                                                  item.category === 'Bahan Kering' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}
                                                            `}>
                                                                {item.category === 'Bahan Basah' ? '🥬' : item.category === 'Bahan Kering' ? '🌾' : '📦'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors capitalize">
                                                                    {item.name.toLowerCase()}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 capitalize">{item.category || 'Umum'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="block font-bold text-lg text-gray-900">
                                                                    {new Intl.NumberFormat('id-ID').format(item.quantity)}
                                                                </span>
                                                                <span className="text-xs text-gray-500 font-medium lowercase">{item.unit}</span>
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-gray-100">
                                                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Stock Gudang</p>
                                                                <p className={`text-xs font-bold ${item.stock >= item.quantity ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {new Intl.NumberFormat('id-ID').format(item.stock || 0)} {item.unit}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Beneficiary Breakdown (Always Show if available) - Distinct Background */}
                                {data?.beneficiaries && data.beneficiaries.length > 0 && (
                                    <div className="p-6 bg-blue-50/50 border-t border-blue-100 flex-grow">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            Detail Penerima Manfaat
                                        </h4>

                                        {/* Group by Category Logic */}
                                        {(() => {
                                            // 1. Group Data
                                            const grouped = {
                                                'PM PAKET BASAH': data.beneficiaries.filter((b: any) => b.category === 'PM PAKET BASAH'),
                                                'PM PAKET KERING': data.beneficiaries.filter((b: any) => b.category === 'PM PAKET KERING'),
                                                'Bumil/Balita': data.beneficiaries.filter((b: any) => b.category === 'Bumil/Balita')
                                            }

                                            // 2. Render Functions for different table structures
                                            const renderStandardTable = (title: string, items: any[]) => {
                                                if (items.length === 0) return null
                                                const totalStudents = items.reduce((sum, b) => sum + b.total, 0)
                                                const totalSmall = items.reduce((sum, b) => sum + b.portionSmall, 0)
                                                const totalLarge = items.reduce((sum, b) => sum + b.portionLarge, 0)

                                                return (
                                                    <div className="mb-8 last:mb-0">
                                                        <h5 className="font-bold text-blue-800 mb-2 uppercase text-sm tracking-wide border-l-4 border-blue-500 pl-2">{title}</h5>
                                                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="bg-blue-50">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left font-bold text-blue-800 w-1/3">Penerima Manfaat</th>
                                                                        <th className="px-4 py-2 text-center font-bold text-blue-800">Jumlah Siswa + GTK</th>
                                                                        <th className="px-4 py-2 text-center font-bold text-blue-800 border-l border-blue-100" colSpan={2}>Porsi</th>
                                                                    </tr>
                                                                    <tr className="bg-blue-50/50 border-b border-blue-100">
                                                                        <th></th>
                                                                        <th></th>
                                                                        <th className="px-4 py-1 text-center text-xs font-semibold text-blue-600">Kecil</th>
                                                                        <th className="px-4 py-1 text-center text-xs font-semibold text-blue-600 border-l border-blue-100">Besar</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-blue-50">
                                                                    {items.map((b: any, i: number) => (
                                                                        <tr key={i} className="hover:bg-blue-50/30">
                                                                            <td className="px-4 py-2 text-gray-700 font-medium">{b.name}</td>
                                                                            <td className="px-4 py-2 text-center text-gray-900">{b.total}</td>
                                                                            <td className="px-4 py-2 text-center text-gray-600 border-l border-blue-50">{b.portionSmall}</td>
                                                                            <td className="px-4 py-2 text-center text-gray-600 border-l border-blue-50">{b.portionLarge}</td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="bg-blue-50 font-bold border-t border-blue-200">
                                                                        <td className="px-4 py-2 text-blue-900">JUMLAH {title.includes('KERING') ? 'SISWA' : 'PM'}</td>
                                                                        <td className="px-4 py-2 text-center text-blue-900">{totalStudents}</td>
                                                                        <td className="px-4 py-2 text-center text-blue-900 border-l border-blue-200">{totalSmall}</td>
                                                                        <td className="px-4 py-2 text-center text-blue-900 border-l border-blue-200">{totalLarge}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )
                                            }

                                            const renderSpecialTable = (items: any[]) => {
                                                if (items.length === 0) return null
                                                const totalBumil = items.reduce((sum, b) => sum + b.portionSmall, 0) // Mapping logic: portionSmall -> Bumil/Busui based on user request? Wait, user example: "Bumil/Busui" col 1, "Balita" col 2. Let's check mapping.
                                                // User Example:
                                                // REJOSARI: Bumil/Busui 16, Balita 20, Total 36.
                                                // DB Mapping need verification. Assuming portionSmall -> Bumil, portionLarge -> Balita OR vice versa.
                                                // Let's assume standard: portionSmall = Balita, portionLarge = Bumil/Busui based on logic "Small = Kecil/Balita".
                                                // BUT User input: "Bumil/Busui" (16) "Balita" (20). 
                                                // Let's look at previous data: 
                                                // REJOSARI: total 36, small 16, large 20.
                                                // User says: Bumil/Busui 16, Balita 20.
                                                // So Small = Bumil/Busui, Large = Balita? Or Small=16 (Bumil), Large=20 (Balita).
                                                
                                                const totalCol1 = items.reduce((sum, b) => sum + b.portionSmall, 0)
                                                const totalCol2 = items.reduce((sum, b) => sum + b.portionLarge, 0)
                                                const grandTotal = items.reduce((sum, b) => sum + b.total, 0)

                                                return (
                                                    <div className="mb-8 last:mb-0">
                                                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="bg-blue-50">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left font-bold text-blue-800 w-1/3">Penerima Manfaat</th>
                                                                        <th className="px-4 py-2 text-center font-bold text-blue-800 border-l border-blue-100" colSpan={2}>Porsi</th>
                                                                        <th className="px-4 py-2 text-center font-bold text-blue-800 border-l border-blue-100"></th>
                                                                    </tr>
                                                                    <tr className="bg-blue-50/50 border-b border-blue-100">
                                                                        <th></th>
                                                                        <th className="px-4 py-1 text-center text-xs font-semibold text-blue-600">Bumil/Busui</th>
                                                                        <th className="px-4 py-1 text-center text-xs font-semibold text-blue-600 border-l border-blue-100">Balita</th>
                                                                        <th className="px-4 py-1 text-center text-xs font-bold text-blue-800 border-l border-blue-100">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-blue-50">
                                                                    {items.map((b: any, i: number) => (
                                                                        <tr key={i} className="hover:bg-blue-50/30">
                                                                            <td className="px-4 py-2 text-gray-700 font-medium">{b.name}</td>
                                                                            <td className="px-4 py-2 text-center text-gray-600 border-l border-blue-50">{b.portionSmall}</td>
                                                                            <td className="px-4 py-2 text-center text-gray-600 border-l border-blue-50">{b.portionLarge}</td>
                                                                            <td className="px-4 py-2 text-center font-bold text-gray-900 border-l border-blue-50">{b.total}</td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="bg-blue-50 font-bold border-t border-blue-200">
                                                                        <td className="px-4 py-2 text-blue-900">JUMLAH</td>
                                                                        <td className="px-4 py-2 text-center text-blue-900 border-l border-blue-200">{totalCol1}</td>
                                                                        <td className="px-4 py-2 text-center text-blue-900 border-l border-blue-200">{totalCol2}</td>
                                                                        <td className="px-4 py-2 text-center text-blue-900 border-l border-blue-200">{grandTotal}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )
                                            }

                                            return (
                                                <div className="space-y-6">
                                                    {renderStandardTable('PM PAKET BASAH', grouped['PM PAKET BASAH'])}
                                                    {renderStandardTable('PM PAKET KERING', grouped['PM PAKET KERING'])}
                                                    
                                                    {grouped['Bumil/Balita'].length > 0 && (
                                                        <div className="mb-8">
                                                             <div className="flex justify-between items-end mb-2">
                                                                <h5 className="font-bold text-blue-800 uppercase text-sm tracking-wide border-l-4 border-blue-500 pl-2">BUMIL/BUSUI & BALITA</h5>
                                                             </div>
                                                             {renderSpecialTable(grouped['Bumil/Balita'])}
                                                        </div>
                                                    )}

                                                    <div className="bg-blue-600 text-white p-4 rounded-lg flex justify-between items-center shadow-md">
                                                        <div className="flex items-center gap-4">
                                                            {data.isSubmitted ? (
                                                                <button 
                                                                    disabled
                                                                    className="bg-green-500 text-white font-bold py-2 px-6 rounded shadow-lg cursor-not-allowed flex items-center gap-2"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    Sudah Disubmit
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={handleSubmitData}
                                                                    disabled={submitting}
                                                                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-2 px-6 rounded shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {submitting ? 'Memproses...' : 'Submit'}
                                                                </button>
                                                            )}
                                                            <span className="font-bold text-lg">TOTAL PM</span>
                                                        </div>
                                                        <span className="font-bold text-2xl">{data.totalBeneficiaries}</span>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
