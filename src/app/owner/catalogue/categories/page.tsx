'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCategories, useDeleteCategory } from '@/hooks/useCategories'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import Link from 'next/link'
import { 
  Tag, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import DeleteConfirmDialog from '@/components/modals/DeleteConfirmDialog'

export default function CategoriesPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const { data: categories, isLoading, error, refetch } = useCategories(tenantId)
  const deleteCategory = useDeleteCategory()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null)

  if (!tenantId) {
    return (
      <PageContainer title="Categories">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const filteredCategories = categories?.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleDelete = async () => {
    if (!categoryToDelete) return

    try {
      await deleteCategory.mutateAsync(categoryToDelete.id)
      toast.success(`Category "${categoryToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category')
    }
  }

  return (
    <PageContainer
      title="Categories"
      description="Manage product categories for your catalogue"
      actions={
        <Link href="/owner/catalogue/categories/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Category
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
              placeholder="Search categories by name, code, or description..."
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categories?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {categories?.filter(c => c.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {categories?.filter(c => !c.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading categories...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <p className="font-semibold mb-2">Error loading categories</p>
              <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
            </div>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No categories found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search'
                : 'Get started by adding your first category'}
            </p>
            <Link href="/owner/catalogue/categories/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Category
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Tag className="h-5 w-5 text-blue-600" />
                      {category.name}
                    </CardTitle>
                    {category.code && (
                      <span className="px-2 py-1 rounded-full text-xs font-mono font-semibold bg-blue-100 text-blue-800">
                        {category.code}
                      </span>
                    )}
                  </div>
                  {category.is_active ? (
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
                {category.description && (
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                )}
                
                <div className="flex gap-2 pt-4 border-t">
                  <Link href={`/owner/catalogue/categories/${category.id}/edit`} className="flex-1">
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
                      setCategoryToDelete({ id: category.id, name: category.name })
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
        title="Delete Category"
        description={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        isLoading={deleteCategory.isPending}
      />
    </PageContainer>
  )
}

