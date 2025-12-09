'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateTenant } from '@/hooks/useTenants'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/layout/Sidebar'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TenantForm from '@/components/forms/TenantForm'
import { Button } from '@/components/ui/button-shadcn'
import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function CreateTenantPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const createTenant = useCreateTenant()

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'superadmin') {
      router.push('/login')
    }
  }, [isAuthenticated, user, router])

  const handleSubmit = async (data: {
    name: string
    code: string
    email?: string
    phone?: string
    address?: string
    owner_email: string
    owner_password: string
    owner_name: string
  }) => {
    try {
      const result = await createTenant.mutateAsync(data)
      toast.success(
        `Tenant created successfully! Owner account: ${result.owner.email}`,
        { duration: 5000 }
      )
      router.push('/superadmin/tenants')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tenant')
    }
  }

  if (!isAuthenticated || user?.role !== 'superadmin') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <PageContainer title="➕ Create New Tenant">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantForm
              onSubmit={handleSubmit}
              isLoading={createTenant.isPending}
              submitLabel="Create Tenant"
            />
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  )
}
