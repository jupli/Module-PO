import DailyCookingView from '@/components/DailyCookingView'

export const dynamic = 'force-dynamic'

export default async function OutgoingPage() {
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Form Bahan Keluar (Usage / Masak)</h1>
        <p className="text-gray-500">
            <strong>Pilih Menu Masakan</strong> untuk pengurangan stok otomatis berdasarkan resep.
        </p>
      </div>
      
      <DailyCookingView />
    </div>
  )
}
