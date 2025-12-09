'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useCreateUser } from '@/hooks/useUsers'
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
import { ArrowLeft, UserPlus, Building2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button-shadcn'

const userSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['branch_admin', 'branch_staff']),
  branch_id: z.string().min(1, 'Branch selection is required'),
})

type UserFormValues = z.infer<typeof userSchema>

export default function CreateUserPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const createUser = useCreateUser()
  const { data: branches, isLoading: branchesLoading } = useBranches(tenantId)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'branch_staff',
      branch_id: '',
    },
  })

  const selectedBranchId = form.watch('branch_id')
  const selectedRole = form.watch('role')
  const selectedBranch = branches?.find(b => b.id === selectedBranchId)

  const onSubmit = async (data: UserFormValues) => {
    if (!tenantId) {
      toast.error('No tenant assigned')
      form.setError('branch_id', { message: 'No tenant assigned' })
      return
    }

    if (!data.branch_id) {
      toast.error('Please select a branch')
      form.setError('branch_id', { message: 'Branch selection is required' })
      return
    }

    try {
      await createUser.mutateAsync({
        ...data,
        tenant_id: tenantId,
        branch_id: data.branch_id,
      })
      
      toast.success(`Staff member "${data.full_name}" created successfully!`)
      form.reset()
      router.push('/owner/users')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create staff member')
    }
  }

  if (!tenantId) {
    return (
      <PageContainer title="Add Staff">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const activeBranches = branches?.filter(b => b.is_active) || []

  if (branchesLoading) {
    return (
      <PageContainer title="Add Staff Member">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Loading branches...</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (activeBranches.length === 0) {
    return (
      <PageContainer title="Add Staff Member">
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No Active Branches</p>
            <p className="text-gray-600 mb-4">
              You need to create at least one branch before adding staff members.
              Staff members must be assigned to a specific branch.
            </p>
            <Link href="/owner/branches/create">
              <Button>Create Branch</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Add Staff Member"
      description="Create a new staff member or branch administrator for a specific branch"
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
              <UserPlus className="h-5 w-5 text-blue-600" />
              Staff Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Branch Selection - Required and First */}
                <FormField
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Branch <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={branchesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder={branchesLoading ? 'Loading branches...' : 'Select a branch'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Staff member will be assigned to this branch. This is required.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Email <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            className="h-12 text-lg"
                            placeholder="user@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Password <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            className="h-12 text-lg"
                            placeholder="Min. 6 characters"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum 6 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Role <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        {selectedRole === 'branch_admin' 
                          ? 'Branch Admin can manage branch operations, staff, and inventory'
                          : 'Staff Member can perform billing and basic stock operations'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRole === 'branch_admin' && selectedBranch && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          Creating Branch Administrator
                        </p>
                        <p className="text-sm text-blue-800">
                          This user will be assigned as a Branch Administrator for <strong>"{selectedBranch.name}"</strong>. 
                          Each branch can have multiple administrators.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => router.back()}
                    disabled={createUser.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={createUser.isPending || branchesLoading}
                  >
                    {createUser.isPending ? 'Creating...' : 'Create Staff Member'}
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
