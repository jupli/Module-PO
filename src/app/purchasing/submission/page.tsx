import { prisma } from '@/lib/prisma'
import SubmissionClient from './SubmissionClient'

export const dynamic = 'force-dynamic'

export default async function SubmissionPage() {
  // Ambil semua permintaan yang sudah diproses (sudah ada harga)
  // Use queryRaw to bypass outdated Prisma Client issues
  const rawRequests: any[] = await prisma.$queryRaw`
    SELECT * FROM PurchaseRequest 
    WHERE status IN ('PROCESSED', 'REJECTED')
    ORDER BY requestDate DESC
  `

  const requests = await Promise.all(rawRequests.map(async (req) => {
    const items: any[] = await prisma.$queryRaw`
      SELECT * FROM PurchaseRequestItem WHERE purchaseRequestId = ${req.id}
    `
    
    return {
      ...req,
      requestDate: typeof req.requestDate === 'string' ? req.requestDate : req.requestDate.toISOString(),
      items: items.map((item) => ({
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }))
    }
  }))

  // Ambil data penerima manfaat untuk proposal
  const rawBeneficiaries: any[] = await prisma.$queryRaw`
    SELECT * FROM Beneficiary ORDER BY date DESC
  `
  
  const beneficiaries = rawBeneficiaries.map(b => ({
    ...b,
    date: typeof b.date === 'string' ? b.date : b.date.toISOString(),
    createdAt: typeof b.createdAt === 'string' ? b.createdAt : b.createdAt.toISOString(),
    updatedAt: typeof b.updatedAt === 'string' ? b.updatedAt : b.updatedAt.toISOString(),
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Pengajuan Pembelian (Siap Cetak)</h1>
          <p className="text-gray-500 mt-1">
            Berikut adalah daftar permintaan yang sudah disetujui dan memiliki harga.
          </p>
        </div>
      </div>

      <SubmissionClient requests={requests} beneficiaries={beneficiaries} />
    </div>
  )
}
