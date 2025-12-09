import { requireAuth } from '@/lib/auth/utils'

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic'

export default async function SalesReport() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Sales Report</h1>
      <p className="mt-4 text-gray-600">View sales reports by date range</p>
    </div>
  )
}

