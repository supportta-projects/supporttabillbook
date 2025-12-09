import { requireRole } from '@/lib/auth/utils'

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic'

export default async function CreateProduct() {
  await requireRole('tenant_owner')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Add Product</h1>
      <p className="mt-4 text-gray-600">Create a new product</p>
    </div>
  )
}

