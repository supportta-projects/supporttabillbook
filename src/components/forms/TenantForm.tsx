'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button-shadcn'
import { Input } from '@/components/ui/input-shadcn'
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
import { Tenant } from '@/types'

const tenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  code: z.string().min(1, 'Code is required').regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, or underscores'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  owner_email: z.string().email('Invalid email').min(1, 'Owner email is required'),
  owner_password: z.string().min(6, 'Password must be at least 6 characters'),
  owner_name: z.string().min(1, 'Owner name is required').max(255, 'Name is too long'),
})

type TenantFormValues = z.infer<typeof tenantSchema>

interface TenantFormProps {
  onSubmit: (data: TenantFormValues) => Promise<void> | void
  defaultValues?: Partial<TenantFormValues>
  isLoading?: boolean
  submitLabel?: string
}

export default function TenantForm({ onSubmit, defaultValues, isLoading, submitLabel = 'Create Tenant' }: TenantFormProps) {
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: defaultValues || {
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      owner_email: '',
      owner_password: '',
      owner_name: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tenant Name *</FormLabel>
              <FormControl>
                <Input placeholder="ABC Store" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tenant Code *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ABC001" 
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>
                Unique code (uppercase letters, numbers, hyphens, underscores only)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tenant@example.com" {...field} />
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
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+1234567890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter tenant address"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-6 border-t space-y-6">
          <div className="text-lg font-semibold text-primary">Shop Owner Account</div>
          <FormDescription className="text-sm text-muted-foreground">
            Create login credentials for the shop owner. They will use these to log in and manage their shop.
          </FormDescription>

          <FormField
            control={form.control}
            name="owner_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="owner_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Email Address *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="owner@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  This will be used for login. Make sure it's unique and not already registered.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="owner_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Password *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter password (min 6 characters)" {...field} />
                </FormControl>
                <FormDescription>
                  Minimum 6 characters. The owner can change this after first login.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            className="flex-1"
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

