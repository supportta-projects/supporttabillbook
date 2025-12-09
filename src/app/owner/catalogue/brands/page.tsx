'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useBrands, useDeleteBrand } from '@/hooks/useBrands'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import Link from 'next/link'
import { 
  Boxes, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import DeleteConfirmDialog from '@/components/modals/DeleteConfirmDialog'

export default function BrandsPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const { data: brands, isLoading, error, refetch } = useBrands(tenantId)
  const deleteBrand = useDeleteBrand()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [brandToDelete, setBrandToDelete] = useState<{ id: string; name: string } | null>(null)

  if (!tenantId) {
    return (
      <PageContainer title="Brands">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const filteredBrands = brands?.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleDelete = async () => {
    if (!brandToDelete) return

    try {
      await deleteBrand.mutateAsync(brandToDelete.id)
      toast.success(`Brand "${brandToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setBrandToDelete(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete brand')
    }
  }

  return (
    <PageContainer
      title="Brands"
      description="Manage product brands for your catalogue"
      actions={
        <Link href="/owner/catalogue/brands/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Brand
          </Button>
        </Link>
      }
    >
      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search brands by name, code, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{brands?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {brands?.filter(b => b.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {brands?.filter(b => !b.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brands List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading brands...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <p className="font-semibold mb-2">Error loading brands</p>
              <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
            </div>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : filteredBrands.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Boxes className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No brands found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search'
                : 'Get started by adding your first brand'}
            </p>
            <Link href="/owner/catalogue/brands/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Brand
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => (
            <Card key={brand.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Boxes className="h-5 w-5 text-purple-600" />
                      {brand.name}
                    </CardTitle>
                    {brand.code && (
                      <span className="px-2 py-1 rounded-full text-xs font-mono font-semibold bg-purple-100 text-purple-800">
                        {brand.code}
                      </span>
                    )}
                  </div>
                  {brand.is_active ? (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Inactive
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {brand.description && (
                  <p className="text-sm text-gray-600 mb-4">{brand.description}</p>
                )}
                
                <div className="flex gap-2 pt-4 border-t">
                  <Link href={`/owner/catalogue/brands/${brand.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2" size="sm">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setBrandToDelete({ id: brand.id, name: brand.name })
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Brand"
        description={`Are you sure you want to delete "${brandToDelete?.name}"? This action cannot be undone.`}
        isLoading={deleteBrand.isPending}
      />
    </PageContainer>
  )
}

