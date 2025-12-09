'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useCreateBrand } from '@/hooks/useBrands'
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
})

type BrandFormValues = z.infer<typeof brandSchema>

export default function CreateBrandPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const createBrand = useCreateBrand()

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  })

  const onSubmit = async (data: BrandFormValues) => {
    if (!tenantId) {
      toast.error('No tenant assigned')
      return
    }

    try {
      await createBrand.mutateAsync({
        ...data,
        tenant_id: tenantId,
      })
      
      toast.success(`Brand "${data.name}" created successfully!`)
      form.reset()
      router.push('/owner/catalogue/brands')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create brand')
    }
  }

  if (!tenantId) {
    return (
      <PageContainer title="Create Brand">
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
      title="Create Brand"
      description="Add a new product brand to your catalogue"
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

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => router.back()}
                    disabled={createBrand.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={createBrand.isPending}
                  >
                    {createBrand.isPending ? 'Creating...' : 'Create Brand'}
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

