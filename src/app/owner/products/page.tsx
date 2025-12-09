import { requireRole } from '@/lib/auth/utils'

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic'

export default async function ProductsList() {
  await requireRole('tenant_owner')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Product List</h1>
      <p className="mt-4 text-gray-600">Manage all products</p>
    </div>
  )
}

