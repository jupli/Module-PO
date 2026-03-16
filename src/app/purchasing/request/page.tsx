import { prisma } from '@/lib/prisma'
import Link from 'next/link'

import RequestActions from '@/components/RequestActions'
import UploadRequestForm from '@/components/UploadRequestForm'
import UploadBeneficiaryForm from '@/components/UploadBeneficiaryForm'
import BeneficiaryActions from '@/components/BeneficiaryActions'

export default async function RequestPage() {
  const requests = await (prisma as any).purchaseRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } }
  })

  // Fetch all beneficiaries to group by date
  const allBeneficiaries = await (prisma as any).beneficiary.findMany({
    select: {
      date: true,
      category: true,
      total: true
    },
    orderBy: {
      date: 'desc'
    }
  })

  // Group by date
  const groupedBeneficiaries = allBeneficiaries.reduce((acc: any, curr: any) => {
    const dateKey = curr.date.toISOString()
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: curr.date,
        categories: new Set(),
        totalItems: 0,
        totalStudents: 0
      }
    }
    if (curr.category) acc[dateKey].categories.add(curr.category)
    acc[dateKey].totalItems += 1
    acc[dateKey].totalStudents += (curr.total || 0)
    return acc
  }, {})

  const beneficiaryList = Object.values(groupedBeneficiaries).map((item: any) => ({
      ...item,
      categories: Array.from(item.categories)
  })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Permintaan Bahan</h1>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <UploadRequestForm />
        <UploadBeneficiaryForm />
      </div>

      {/* List Section: Purchase Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">Data Permintaan Bahan</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Request</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Belum ada data permintaan. Silakan upload file Excel.
                </td>
              </tr>
            ) : (
              requests.map((req: any) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(req.requestDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {req.notes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {req._count.items} Item
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                        req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <RequestActions requestId={req.id} currentStatus={req.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* List Section: Beneficiaries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">Data Penerima Manfaat</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori / Catatan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Item (Sekolah)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {beneficiaryList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Belum ada data penerima manfaat. Silakan upload file Excel.
                </td>
              </tr>
            ) : (
              beneficiaryList.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {item.categories.length > 0 ? item.categories.join(', ') : 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.totalItems} Sekolah / {item.totalStudents.toLocaleString('id-ID')} Siswa
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      UPLOADED
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <BeneficiaryActions date={item.date.toISOString()} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
