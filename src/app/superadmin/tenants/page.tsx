'use client'

import { useTenants, useDeleteTenant } from '@/hooks/useTenants'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/layout/Sidebar'
import PageContainer from '@/components/layout/PageContainer'
import TenantCard from '@/components/cards/TenantCard'
import DeleteConfirmDialog from '@/components/modals/DeleteConfirmDialog'
import { Button } from '@/components/ui/button-shadcn'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Tenant } from '@/types'

export default function TenantsListPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { data: tenants, isLoading } = useTenants()
  const deleteTenant = useDeleteTenant()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'superadmin') {
      router.push('/login')
    }
  }, [isAuthenticated, user, router])

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return

    setDeletingId(tenantToDelete.id)
    try {
      await deleteTenant.mutateAsync(tenantToDelete.id)
      setDeleteDialogOpen(false)
      setTenantToDelete(null)
    } catch (error) {
      console.error('Failed to delete tenant:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthenticated || user?.role !== 'superadmin') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <PageContainer
        title="🏪 Manage Tenants"
        actions={
          <Link href="/superadmin/tenants/create">
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create New Tenant
            </Button>
          </Link>
        }
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4 p-6 border rounded-lg">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : tenants && tenants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onDelete={() => handleDeleteClick(tenant)}
                isDeleting={deletingId === tenant.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <p className="text-xl text-muted-foreground mb-2">No tenants yet</p>
            <p className="text-sm text-muted-foreground mb-6">Create your first tenant to get started</p>
            <Link href="/superadmin/tenants/create">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create First Tenant
              </Button>
            </Link>
          </div>
        )}

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete Tenant"
          description={`Are you sure you want to delete "${tenantToDelete?.name}"? This will delete all associated data including branches, products, stock, bills, and expenses. This action cannot be undone.`}
          isLoading={deletingId === tenantToDelete?.id}
        />
      </PageContainer>
    </div>
  )
}
