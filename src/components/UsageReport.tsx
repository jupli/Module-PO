'use client'

import { useState, useEffect } from 'react'
import { getStockMovements } from '@/app/actions/inventory'
import { MovementType } from '@prisma/client'

export default function UsageReport() {
    const [movements, setMovements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    const fetchReport = async (date: string) => {
        setLoading(true)
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        const result = await getStockMovements({
            startDate: start,
            endDate: end,
            type: 'OUT' as any // Use string to avoid importing MovementType from @prisma/client in client component
        })

        if (result.success && result.data) {
            // Filter to only include Daily Usage movements
            const usageOnly = result.data.filter((m: any) => m.reference && m.reference.startsWith('USAGE-'))
            setMovements(usageOnly)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchReport(selectedDate)
    }, [selectedDate])

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Laporan Bahan Keluar (Dimasak)</h2>
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : movements.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500">Tidak ada data pemakaian bahan pada tanggal ini.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Bahan</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Jumlah Keluar</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {movements.map((m) => (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {m.product.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">
                                            {m.product.category || 'Umum'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                                        -{new Intl.NumberFormat('id-ID').format(m.quantity)} {m.product.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                                        {m.notes}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
