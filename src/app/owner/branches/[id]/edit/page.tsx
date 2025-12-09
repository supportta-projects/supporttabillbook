'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useBranches, useUpdateBranch } from '@/hooks/useBranches'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BranchForm from '@/components/forms/BranchForm'
import { ArrowLeft, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button-shadcn'

export default function EditBranchPage() {
  const router = useRouter()
  const params = useParams()
  const branchId = params.id as string
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const updateBranch = useUpdateBranch()
  const { data: branches, isLoading: branchesLoading } = useBranches(tenantId)
  
  const branch = branches?.find(b => b.id === branchId)

  if (!tenantId) {
    return (
      <PageContainer title="Edit Branch">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (branchesLoading) {
    return (
      <PageContainer title="Edit Branch">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading branch information...</div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!branch) {
    return (
      <PageContainer title="Edit Branch">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Branch not found</p>
            <Link href="/owner/branches">
              <Button className="mt-4">Back to Branches</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const onSubmit = async (data: { name: string; code: string; address?: string; phone?: string; is_main?: boolean }) => {
    try {
      await updateBranch.mutateAsync({
        id: branchId,
        ...data,
      })
      
      toast.success(`Branch "${data.name}" updated successfully!`)
      router.push('/owner/branches')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branch')
    }
  }

  return (
    <PageContainer
      title="Edit Branch"
      description="Update branch information"
    >
      <div className="max-w-2xl">
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
              defaultValues={{
                name: branch.name,
                code: branch.code,
                address: branch.address || '',
                phone: branch.phone || '',
                is_main: branch.is_main || false,
              }}
              isLoading={updateBranch.isPending}
              submitLabel="Update Branch"
              showMainBranchOption={true}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

