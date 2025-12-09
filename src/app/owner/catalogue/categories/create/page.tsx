'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useCreateCategory } from '@/hooks/useCategories'
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
})

type CategoryFormValues = z.infer<typeof categorySchema>

export default function CreateCategoryPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const createCategory = useCreateCategory()

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  })

  const onSubmit = async (data: CategoryFormValues) => {
    if (!tenantId) {
      toast.error('No tenant assigned')
      return
    }

    try {
      await createCategory.mutateAsync({
        ...data,
        tenant_id: tenantId,
      })
      
      toast.success(`Category "${data.name}" created successfully!`)
      form.reset()
      router.push('/owner/catalogue/categories')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category')
    }
  }

  if (!tenantId) {
    return (
      <PageContainer title="Create Category">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Create Category"
      description="Add a new product category to your catalogue"
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

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => router.back()}
                    disabled={createCategory.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={createCategory.isPending}
                  >
                    {createCategory.isPending ? 'Creating...' : 'Create Category'}
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

