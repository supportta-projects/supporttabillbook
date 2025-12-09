'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCreateBranch } from '@/hooks/useBranches'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BranchForm from '@/components/forms/BranchForm'
import { ArrowLeft, Building2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button-shadcn'

export default function CreateBranchPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const createBranch = useCreateBranch()

  const onSubmit = async (data: { 
    name: string
    code: string
    address?: string
    phone?: string
    create_admin?: boolean
    admin_name?: string
    admin_email?: string
    admin_password?: string
  }) => {
    if (!tenantId) {
      toast.error('No tenant assigned. Please contact your administrator.')
      return
    }

    try {
      const result = await createBranch.mutateAsync({
        tenant_id: tenantId,
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        create_admin: data.create_admin ?? true,
        admin_name: data.admin_name,
        admin_email: data.admin_email,
        admin_password: data.admin_password,
      })
      
      if (result.admin) {
        toast.success(`Branch "${data.name}" and admin "${result.admin.full_name}" created successfully!`)
      } else {
        toast.success(`Branch "${data.name}" created successfully!`)
      }
      
      router.push('/owner/branches')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create branch')
    }
  }

  if (!tenantId) {
    return (
      <PageContainer title="Create Branch">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Create New Branch"
      description="Add a new branch to your shop network. Optionally create a branch administrator account."
    >
      <div className="max-w-3xl">
        <Link href="/owner/branches">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Branches
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Branch Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BranchForm
              onSubmit={onSubmit}
              isLoading={createBranch.isPending}
              submitLabel={createBranch.isPending ? 'Creating Branch...' : 'Create Branch'}
            />
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-900">About Branch Administrators</p>
                <p className="text-sm text-blue-800">
                  Each branch should have at least one administrator who can manage branch operations, 
                  staff, inventory, and billing. You can create additional staff members later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
