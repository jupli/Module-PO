import { PaymentStatus } from '@prisma/client'

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const colors: Record<PaymentStatus, string> = {
    UNPAID: 'bg-red-100 text-red-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
  }

  const labels: Record<PaymentStatus, string> = {
    UNPAID: 'Belum Lunas',
    PARTIAL: 'Cicilan',
    PAID: 'Lunas',
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
      {labels[status]}
    </span>
  )
}
