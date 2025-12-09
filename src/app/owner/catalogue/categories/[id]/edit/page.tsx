'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useCategories, useUpdateCategory } from '@/hooks/useCategories'
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
import { ArrowLeft, Tag } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button-shadcn'

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Name is too long'),
  code: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

export default function EditCategoryPage() {
  const router = useRouter()
  const params = useParams()
  const categoryId = params.id as string
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const updateCategory = useUpdateCategory()
  const { data: categories, isLoading } = useCategories(tenantId)
  
  const category = categories?.find(c => c.id === categoryId)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      code: category?.code || '',
      description: category?.description || '',
      is_active: category?.is_active ?? true,
    },
  })

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        code: category.code || '',
        description: category.description || '',
        is_active: category.is_active ?? true,
      })
    }
  }, [category, form])

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      await updateCategory.mutateAsync({
        id: categoryId,
        ...data,
      })
      
      toast.success(`Category "${data.name}" updated successfully!`)
      router.push('/owner/catalogue/categories')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update category')
    }
  }

  if (isLoading) {
    return (
      <PageContainer title="Edit Category">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading category information...</div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!category) {
    return (
      <PageContainer title="Edit Category">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Category not found</p>
            <Link href="/owner/catalogue/categories">
              <Button className="mt-4">Back to Categories</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Edit Category"
      description="Update category information"
    >
      <div className="max-w-2xl">
        <Link href="/owner/catalogue/categories">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              Category Information
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
                        Category Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-12 text-lg"
                          placeholder="e.g., Electronics, Clothing, Food"
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
                      <FormLabel className="text-lg font-semibold">Category Code</FormLabel>
                      <FormControl>
                        <Input
                          className="h-12 text-lg font-mono"
                          placeholder="e.g., ELEC, CLOTH, FOOD"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional unique code for this category
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
                          placeholder="Brief description of this category..."
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
                          Category Status
                        </FormLabel>
                        <FormDescription>
                          Active categories are visible in product selection
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
                    disabled={updateCategory.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={updateCategory.isPending}
                  >
                    {updateCategory.isPending ? 'Updating...' : 'Update Category'}
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

