import { requireAuth } from '@/lib/auth/utils'

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic'

export default async function PurchasesList() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Purchase List</h1>
      <p className="mt-4 text-gray-600">View all purchase entries</p>
    </div>
  )
}

