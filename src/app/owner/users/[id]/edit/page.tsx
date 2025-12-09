'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useUsers, useUpdateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input-shadcn'
import { ArrowLeft, UserPen } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button-shadcn'

const userSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255, 'Name is too long'),
  role: z.enum(['branch_admin', 'branch_staff']).refine((val) => val !== undefined, {
    message: 'Please select a role',
  }),
  branch_id: z.string().min(1, 'Branch assignment is required for staff members'),
  is_active: z.boolean(),
})

type UserFormValues = z.infer<typeof userSchema>

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const { user: currentUser } = useAuthStore()
  const tenantId = currentUser?.tenant_id
  const updateUser = useUpdateUser()
  const { data: users, isLoading: usersLoading } = useUsers(tenantId)
  const { data: branches, isLoading: branchesLoading } = useBranches(tenantId)
  
  const user = users?.find(u => u.id === userId)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      role: (user?.role === 'branch_admin' || user?.role === 'branch_staff') ? user.role : 'branch_staff',
      branch_id: user?.branch_id || '',
      is_active: (user as any)?.is_active ?? true,
    },
  })

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name,
        role: (user.role === 'branch_admin' || user.role === 'branch_staff') ? user.role : 'branch_staff',
        branch_id: user.branch_id || '',
        is_active: (user as any)?.is_active ?? true,
      })
    }
  }, [user, form])

  if (!tenantId) {
    return (
      <PageContainer title="Edit Staff">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (usersLoading || branchesLoading) {
    return (
      <PageContainer title="Edit Staff">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading staff information...</div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!user) {
    return (
      <PageContainer title="Edit Staff">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">User not found</p>
            <Link href="/owner/users">
              <Button className="mt-4">Back to Staff</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const onSubmit = async (data: UserFormValues) => {
    try {
      await updateUser.mutateAsync({
        id: userId,
        ...data,
        branch_id: data.branch_id, // Required, no need to convert to undefined
      })
      
      toast.success(`User "${data.full_name}" updated successfully!`)
      router.push('/owner/users')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  return (
    <PageContainer
      title="Edit Staff Member"
      description="Update staff member information"
    >
      <div className="max-w-2xl">
        <Link href="/owner/users">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Staff
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPen className="h-5 w-5 text-blue-600" />
              Staff Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Full Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-12 text-lg"
                          placeholder="Enter full name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Email Address</p>
                  <p className="font-semibold">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Role <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-lg">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="branch_admin">Branch Administrator</SelectItem>
                            <SelectItem value="branch_staff">Staff Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Branch Admin can manage branch operations, Staff can perform basic tasks
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Branch <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-lg">
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches?.filter(b => b.is_active).map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name} ({branch.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Staff members must be assigned to a branch. This is required.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-lg font-semibold">
                          Account Status
                        </FormLabel>
                        <FormDescription>
                          Active users can log in, inactive users cannot
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'true')}
                          value={field.value ? 'true' : 'false'}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Active</SelectItem>
                            <SelectItem value="false">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={updateUser.isPending}
                  >
                    {updateUser.isPending ? 'Updating...' : 'Update Staff Member'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

