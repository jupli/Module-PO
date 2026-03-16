import UsageReport from '@/components/UsageReport'

export const dynamic = 'force-dynamic'

export default function InventoryHistoryPage() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Riwayat Penggunaan Bahan (Daily Usage Report)</h1>
                <p className="text-gray-500">
                    Laporan detail bahan makanan yang telah dimasak/digunakan berdasarkan tanggal.
                </p>
            </div>
            
            <UsageReport />
        </div>
    )
}
