'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useBrands, useUpdateBrand } from '@/hooks/useBrands'
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
import { Input } from '@/components/ui/input-shadcn'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Boxes } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button-shadcn'

const brandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(255, 'Name is too long'),
  code: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean(),
})

type BrandFormValues = z.infer<typeof brandSchema>

export default function EditBrandPage() {
  const router = useRouter()
  const params = useParams()
  const brandId = params.id as string
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const updateBrand = useUpdateBrand()
  const { data: brands, isLoading } = useBrands(tenantId)
  
  const brand = brands?.find(b => b.id === brandId)

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: brand?.name || '',
      code: brand?.code || '',
      description: brand?.description || '',
      is_active: brand?.is_active ?? true,
    },
  })

  useEffect(() => {
    if (brand) {
      form.reset({
        name: brand.name,
        code: brand.code || '',
        description: brand.description || '',
        is_active: brand.is_active ?? true,
      })
    }
  }, [brand, form])

  const onSubmit = async (data: BrandFormValues) => {
    try {
      await updateBrand.mutateAsync({
        id: brandId,
        ...data,
      })
      
      toast.success(`Brand "${data.name}" updated successfully!`)
      router.push('/owner/catalogue/brands')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update brand')
    }
  }

  if (isLoading) {
    return (
      <PageContainer title="Edit Brand">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading brand information...</div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!brand) {
    return (
      <PageContainer title="Edit Brand">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Brand not found</p>
            <Link href="/owner/catalogue/brands">
              <Button className="mt-4">Back to Brands</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Edit Brand"
      description="Update brand information"
    >
      <div className="max-w-2xl">
        <Link href="/owner/catalogue/brands">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Brands
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-purple-600" />
              Brand Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Brand Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-12 text-lg"
                          placeholder="e.g., Samsung, Nike, Coca-Cola"
                          {...field}
                        />
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
                      <FormLabel className="text-lg font-semibold">Brand Code</FormLabel>
                      <FormControl>
                        <Input
                          className="h-12 text-lg font-mono"
                          placeholder="e.g., SAM, NIKE, COKE"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional unique code for this brand
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className="text-lg"
                          placeholder="Brief description of this brand..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-lg font-semibold">
                          Brand Status
                        </FormLabel>
                        <FormDescription>
                          Active brands are visible in product selection
                        </FormDescription>
                      </div>
                      <FormControl>
                        <select
                          value={field.value ? 'true' : 'false'}
                          onChange={(e) => field.onChange(e.target.value === 'true')}
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
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
                    disabled={updateBrand.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={updateBrand.isPending}
                  >
                    {updateBrand.isPending ? 'Updating...' : 'Update Brand'}
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

