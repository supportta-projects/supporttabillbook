'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useBranches } from '@/hooks/useBranches'
import { useDeleteBranch } from '@/hooks/useBranches'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import Link from 'next/link'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import DeleteConfirmDialog from '@/components/modals/DeleteConfirmDialog'

export default function BranchesListPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  
  const { data: branches, isLoading, error, refetch } = useBranches(tenantId)
  const deleteBranch = useDeleteBranch()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<{ id: string; name: string } | null>(null)

  if (!tenantId) {
    return (
      <PageContainer title="Branch Management">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const filteredBranches = branches?.filter(branch =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.address?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleDelete = async () => {
    if (!branchToDelete) return

    try {
      await deleteBranch.mutateAsync(branchToDelete.id)
      toast.success(`Branch "${branchToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setBranchToDelete(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete branch')
    }
  }

  return (
    <PageContainer
      title="Branch Management"
      description="Manage all your shop branches"
      actions={
        <Link href="/owner/branches/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Branch
          </Button>
        </Link>
      }
    >
      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search branches by name, code, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{branches?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {branches?.filter(b => b.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {branches?.filter(b => !b.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading branches...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <p className="font-semibold mb-2">Error loading branches</p>
              <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
            </div>
            {error.message?.includes('session has expired') || error.message?.includes('Unauthorized') ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">Your session may have expired. Please log in again.</p>
                <Link href="/login">
                  <Button>Go to Login</Button>
                </Link>
              </div>
            ) : (
              <Button onClick={() => refetch()} className="mt-4">Retry</Button>
            )}
          </CardContent>
        </Card>
      ) : filteredBranches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No branches found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search'
                : 'Get started by adding your first branch'}
            </p>
            <Link href="/owner/branches/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Branch
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((branch) => (
            <Card key={branch.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {branch.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {branch.is_active ? (
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
                      <span className="px-2 py-1 rounded-full text-xs font-mono font-semibold bg-blue-100 text-blue-800">
                        {branch.code}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {branch.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{branch.address}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Link href={`/owner/branches/${branch.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2" size="sm">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/owner/branches/${branch.id}/edit`} className="flex-1">
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
                      setBranchToDelete({ id: branch.id, name: branch.name })
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
        title="Delete Branch"
        description={`Are you sure you want to delete "${branchToDelete?.name}"? This action cannot be undone and will affect all associated data.`}
        isLoading={deleteBranch.isPending}
      />
    </PageContainer>
  )
}
