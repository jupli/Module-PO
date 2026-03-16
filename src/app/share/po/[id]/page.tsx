import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PurchaseOrderViewer from '@/components/PurchaseOrderViewer'

export const dynamic = 'force-dynamic'

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Use raw query to ensure we get all columns including potentially new ones like purchasingSign
  const requests: any[] = await prisma.$queryRaw`
    SELECT * FROM PurchaseRequest WHERE id = ${id}
  `
  const request = requests[0]

  if (!request) {
    notFound()
  }

  const items: any[] = await prisma.$queryRaw`
    SELECT * FROM PurchaseRequestItem WHERE purchaseRequestId = ${id}
  `

  request.items = items

  // Serialize data
  const serializedRequest = {
    ...request,
    requestDate: new Date(request.requestDate).toISOString(),
    items: request.items.map((item: any) => ({
      ...item,
      price: Number(item.price),
      quantity: Number(item.quantity)
    })),
    // Ensure nulls are preserved or handled
    purchasingSign: request.purchasingSign || null,
    managerSign: request.managerSign || null,
    rejectionReason: request.rejectionReason || null
  }

  // Ambil data penerima manfaat untuk proposal (sama seperti di submission page)
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
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex items-center justify-center">
      <PurchaseOrderViewer request={serializedRequest} showShareButton={false} beneficiaries={beneficiaries} />
    </div>
  )
}
