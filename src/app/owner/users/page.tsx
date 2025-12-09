'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUsers } from '@/hooks/useUsers'
import { useDeleteUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import Link from 'next/link'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  User as UserIcon,
  Building2,
  Shield,
  UserCheck,
  XCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import DeleteConfirmDialog from '@/components/modals/DeleteConfirmDialog'

const ROLE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  tenant_owner: { label: 'Owner', icon: Shield, color: 'bg-purple-100 text-purple-800' },
  branch_admin: { label: 'Branch Admin', icon: UserCheck, color: 'bg-blue-100 text-blue-800' },
  branch_staff: { label: 'Staff', icon: UserIcon, color: 'bg-green-100 text-green-800' },
}

export default function StaffManagementPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  
  const { data: staff, isLoading, error, refetch } = useUsers(tenantId)
  const { data: branches } = useBranches(tenantId)
  const deleteUser = useDeleteUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null)

  if (!tenantId) {
    return (
      <PageContainer title="Staff Management">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  // Filter out tenant owner from staff list
  const staffList = staff?.filter(u => u.role !== 'tenant_owner' && u.tenant_id === tenantId) || []
  
  const filteredStaff = staffList.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      await deleteUser.mutateAsync(userToDelete.id)
      toast.success(`User "${userToDelete.name}" deactivated successfully`)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate user')
    }
  }

  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'No Branch'
    return branches?.find(b => b.id === branchId)?.name || 'Unknown Branch'
  }

  return (
    <PageContainer
      title="Staff Management"
      description="Manage your staff members and branch administrators"
      actions={
        <Link href="/owner/users/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Staff
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
              placeholder="Search staff by name, email, or role..."
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{staffList.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Branch Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {staffList.filter(s => s.role === 'branch_admin').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {staffList.filter(s => (s as any).is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading staff...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600">Error loading staff: {error.message}</div>
            <Button onClick={() => refetch()} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      ) : filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No staff found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search'
                : 'Get started by adding your first staff member'}
            </p>
            <Link href="/owner/users/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Staff
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStaff.map((member) => {
            const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.branch_staff
            const RoleIcon = roleInfo.icon

            return (
              <Card key={member.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <UserIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {member.full_name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${roleInfo.color}`}>
                              <RoleIcon className="h-3 w-3" />
                              {roleInfo.label}
                            </span>
                            {(member as any).is_active ? (
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span>{member.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Building2 className="h-4 w-4" />
                              <span>{getBranchName(member.branch_id)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">
                      <Link href={`/owner/users/${member.id}/edit`}>
                        <Button variant="outline" className="w-full gap-2" size="lg">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="lg"
                        className="gap-2"
                        onClick={() => {
                          setUserToDelete({ id: member.id, name: member.full_name })
                          setDeleteDialogOpen(true)
                        }}
                        disabled={member.id === user?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        Deactivate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Deactivate User"
        description={`Are you sure you want to deactivate "${userToDelete?.name}"? They will no longer be able to access the system.`}
        isLoading={deleteUser.isPending}
      />
    </PageContainer>
  )
}
