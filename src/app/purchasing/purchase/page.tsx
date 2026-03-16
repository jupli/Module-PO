import { prisma } from '@/lib/prisma'
import PurchaseClient from './PurchaseClient'

export default async function PurchasePage() {
  // Fetch APPROVED and REJECTED requests
  const requests = await (prisma as any).purchaseRequest.findMany({
    where: {
      status: {
        in: ['APPROVED', 'REJECTED']
      }
    },
    include: {
      items: true
    },
    orderBy: {
      requestDate: 'desc'
    }
  })

  // Serialize dates to pass to Client Component
  const serializedRequests = requests.map((req: any) => ({
    ...req,
    requestDate: req.requestDate.toISOString(), // Convert Date to string
    items: req.items.map((item: any) => ({
      ...item,
      // Ensure numeric fields are numbers
      price: Number(item.price),
      quantity: Number(item.quantity)
    }))
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Pembelian Bahan (Purchase Order)</h1>
      </div>

      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Daftar di bawah ini adalah permintaan bahan yang sudah disetujui (APPROVED) atau perlu diperbaiki (REJECTED).
              Silakan isi harga satuan untuk setiap item, lalu klik "Ajukan Pembelian".
            </p>
          </div>
        </div>
      </div>

      <PurchaseClient requests={serializedRequests} />
    </div>
  )
}
