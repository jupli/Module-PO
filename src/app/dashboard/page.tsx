
import { getDashboardStats } from '../actions/dashboard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  console.log('Rendering Dashboard Page...')
  try {
    const stats = await getDashboardStats()
    console.log('Dashboard Stats loaded:', stats ? 'Success' : 'Failed')

    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Products</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalProducts}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Low Stock Items</h3>
            <p className="text-3xl font-bold text-red-600">{stats.lowStockProducts}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Suppliers</h3>
            <p className="text-3xl font-bold text-green-600">{stats.totalSuppliers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Pending POs</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingPOs}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Recent Purchase Orders</h2>
            <Link href="/purchase-orders" className="text-blue-500 hover:text-blue-700 text-sm">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentPOs.map((po) => (
                  <tr key={po.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.poNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{po.supplier.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(po.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(po.totalAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${po.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                          po.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                          po.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.recentPOs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No recent purchase orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
    throw error
  }
}
