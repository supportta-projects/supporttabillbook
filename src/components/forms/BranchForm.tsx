'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button-shadcn'
import { Input } from '@/components/ui/input-shadcn'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Building2, UserPlus } from 'lucide-react'

const branchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(255, 'Name is too long'),
  code: z.string().min(1, 'Branch code is required').regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, or underscores'),
  address: z.string().optional(),
  phone: z.string().optional(),
  // Branch Admin fields
  create_admin: z.boolean(),
  admin_name: z.string().max(255, 'Name is too long').optional(),
  admin_email: z.string().email('Invalid email').optional(),
  admin_password: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).refine((data) => {
  // If create_admin is true, admin fields are required
  if (data.create_admin) {
    return !!(data.admin_name && data.admin_name.trim() !== '' && 
              data.admin_email && data.admin_email.trim() !== '' && 
              data.admin_password && data.admin_password.trim() !== '' && 
              data.admin_password.length >= 6)
  }
  return true
}, {
  message: 'Admin name, email, and password (min. 6 characters) are required when creating branch admin',
  path: ['admin_email'],
})

type BranchFormValues = z.infer<typeof branchSchema>

interface BranchFormProps {
  onSubmit: (data: BranchFormValues) => Promise<void> | void
  defaultValues?: Partial<BranchFormValues>
  isLoading?: boolean
  submitLabel?: string
}

export default function BranchForm({ onSubmit, defaultValues, isLoading, submitLabel = 'Create Branch' }: BranchFormProps) {
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      code: defaultValues?.code || '',
      address: defaultValues?.address || '',
      phone: defaultValues?.phone || '',
      create_admin: defaultValues?.create_admin ?? true,
      admin_name: defaultValues?.admin_name || '',
      admin_email: defaultValues?.admin_email || '',
      admin_password: defaultValues?.admin_password || '',
    },
  })

  const createAdmin = form.watch('create_admin')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Branch Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Branch Information</h3>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">
                  Branch Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    className="h-12 text-lg"
                    placeholder="e.g., Main Branch, Downtown Branch" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Enter a clear, descriptive name for this branch
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">
                  Branch Code <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    className="h-12 text-lg font-mono"
                    placeholder="e.g., MAIN, BR001" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription>
                  Unique code for this branch (uppercase letters, numbers, hyphens, underscores only)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Address</FormLabel>
                  <FormControl>
                    <Input 
                      className="h-12 text-lg"
                      placeholder="e.g., 123 Main Street" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel"
                      className="h-12 text-lg"
                      placeholder="e.g., +1234567890" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Branch Admin Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Branch Administrator</h3>
          </div>

          <FormField
            control={form.control}
            name="create_admin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold">
                    Create Branch Admin Account
                  </FormLabel>
                  <FormDescription>
                    Each branch should have at least one administrator to manage operations
                  </FormDescription>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {createAdmin && (
            <div className="space-y-4 pl-4 border-l-2 border-purple-200">
              <FormField
                control={form.control}
                name="admin_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">
                      Admin Full Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="h-12 text-lg"
                        placeholder="e.g., John Doe" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="admin_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Admin Email <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          className="h-12 text-lg"
                          placeholder="admin@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admin_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Admin Password <span className="text-red-500">*</span>
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
                        Minimum 6 characters. Admin will use this to log in.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
