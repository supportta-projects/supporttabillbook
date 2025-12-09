'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useCreateProduct } from '@/hooks/useProducts'
import PageContainer from '@/components/layout/PageContainer'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Package, Plus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Name is too long'),
  sku: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  selling_price: z.number().min(0.01, 'Selling price must be greater than 0'),
  purchase_price: z.number().min(0).optional().or(z.literal('')),
  gst_rate: z.number().min(0).max(100).optional().or(z.literal('')),
  min_stock: z.number().min(0).optional().or(z.literal('')),
  description: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

const UNITS = [
  'Pieces',
  'Kg',
  'Grams',
  'Liters',
  'ML',
  'Box',
  'Pack',
  'Dozen',
  'Meters',
  'Feet',
  'Sq. Feet',
  'Sq. Meters',
]

export default function CreateProductPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const createProduct = useCreateProduct()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      unit: 'Pieces',
      selling_price: 0,
      purchase_price: '',
      gst_rate: '',
      min_stock: '',
      description: '',
    },
  })

  const onSubmit = async (data: ProductFormValues) => {
    if (!user?.tenant_id) {
      toast.error('No tenant assigned. Please contact your administrator.')
      return
    }

    try {
      await createProduct.mutateAsync({
        tenant_id: user.tenant_id,
        name: data.name.trim(),
        sku: data.sku?.trim() || undefined,
        unit: data.unit.trim(),
        selling_price: data.selling_price,
        purchase_price: typeof data.purchase_price === 'number' ? data.purchase_price : undefined,
        gst_rate: typeof data.gst_rate === 'number' ? data.gst_rate : undefined,
        min_stock: typeof data.min_stock === 'number' ? data.min_stock : undefined,
        description: data.description?.trim() || undefined,
      })
      
      toast.success(`Product "${data.name}" created successfully!`)
      form.reset()
      router.push('/branch/stock')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product')
    }
  }

  if (!user?.tenant_id) {
    return (
      <PageContainer title="Add Product">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Add New Product"
      description="Create a new product to add to your inventory"
    >
      <div className="max-w-3xl">
        <Link href="/branch/stock">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Stock List
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Product Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-12 text-lg"
                            placeholder="e.g., Coca Cola 500ml"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the full product name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          SKU (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-12 text-lg"
                            placeholder="e.g., COKE-500ML"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Product code or SKU (Stock Keeping Unit)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Unit <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-lg">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Measurement unit for this product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selling_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Selling Price (₹) <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="h-12 text-lg"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Price at which you sell this product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Purchase Price (₹)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-12 text-lg"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? '' : parseFloat(value) || 0)
                            }}
                            value={field.value === '' ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>
                          Price at which you buy this product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gst_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          GST Rate (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="h-12 text-lg"
                            placeholder="0"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? '' : parseFloat(value) || 0)
                            }}
                            value={field.value === '' ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>
                          GST percentage (0-100)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Minimum Stock Level
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            className="h-12 text-lg"
                            placeholder="0"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? '' : parseInt(value) || 0)
                            }}
                            value={field.value === '' ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>
                          Alert when stock falls below this level
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Description (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[100px] text-lg"
                          placeholder="Additional details about this product..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional information about this product
                      </FormDescription>
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
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1 gap-2"
                    disabled={createProduct.isPending}
                  >
                    {createProduct.isPending ? (
                      'Creating Product...'
                    ) : (
                      <>
                        <Package className="h-5 w-5" />
                        Create Product
                      </>
                    )}
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

