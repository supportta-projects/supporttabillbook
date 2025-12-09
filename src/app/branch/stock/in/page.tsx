'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useProducts } from '@/hooks/useProducts'
import { useCurrentStock } from '@/hooks/useStock'
import { useStockIn } from '@/hooks/useStock'
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
import { ArrowLeft, Plus, Package, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const stockInSchema = z.object({
  product_id: z.string().min(1, 'Please select a product'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().optional(),
})

type StockInFormValues = z.infer<typeof stockInSchema>

function StockInPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const branchId = user?.branch_id
  const preSelectedProductId = searchParams.get('product_id')

  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: stockData } = useCurrentStock(branchId || '')
  const stockIn = useStockIn()

  const form = useForm<StockInFormValues>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      product_id: preSelectedProductId || '',
      quantity: 1,
      reason: '',
    },
  })

  const selectedProductId = form.watch('product_id')
  const selectedProduct = products?.find(p => p.id === selectedProductId)
  const currentStockItem = stockData?.find((item: any) => item.product_id === selectedProductId)
  const currentQuantity = currentStockItem?.quantity || 0

  const onSubmit = async (data: StockInFormValues) => {
    if (!branchId) {
      toast.error('No branch assigned')
      return
    }

    try {
      await stockIn.mutateAsync({
        branch_id: branchId,
        product_id: data.product_id,
        quantity: data.quantity,
        reason: data.reason || undefined,
      })
      
      toast.success(`Successfully added ${data.quantity} ${selectedProduct?.unit || 'units'} of ${selectedProduct?.name}`)
      form.reset()
      router.push('/branch/stock')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add stock')
    }
  }

  if (!branchId) {
    return (
      <PageContainer title="Add Stock">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No branch assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Add Stock"
      description="Add stock to your inventory"
    >
      <div className="max-w-2xl">
        <Link href="/branch/stock">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Stock List
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Stock-In Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Select Product <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={productsLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="Choose a product..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.filter(p => p.is_active).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>{product.name}</span>
                                {product.sku && (
                                  <span className="text-gray-500 text-sm">({product.sku})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Search and select the product you want to add stock for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProduct && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Product Name</p>
                          <p className="font-semibold text-lg">{selectedProduct.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Unit</p>
                          <p className="font-semibold text-lg">{selectedProduct.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Current Stock</p>
                          <p className="font-bold text-xl text-blue-600">
                            {currentQuantity} {selectedProduct.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Selling Price</p>
                          <p className="font-semibold text-lg">₹{selectedProduct.selling_price.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Quantity to Add <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="h-12 text-lg"
                          placeholder="Enter quantity"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter how many {selectedProduct?.unit || 'units'} you want to add
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProduct && form.watch('quantity') > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">New Stock After Adding:</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">
                        {currentQuantity + (form.watch('quantity') || 0)} {selectedProduct.unit}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Current: {currentQuantity} + Adding: {form.watch('quantity') || 0}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Reason (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[100px] text-lg"
                          placeholder="e.g., New purchase from supplier, Stock adjustment, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Add a note about why you're adding this stock
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
                    disabled={stockIn.isPending || !selectedProduct}
                  >
                    {stockIn.isPending ? (
                      'Adding Stock...'
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        Add Stock
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

export default function StockInPage() {
  return (
    <Suspense fallback={
      <PageContainer title="Add Stock">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading...</div>
          </CardContent>
        </Card>
      </PageContainer>
    }>
      <StockInPageContent />
    </Suspense>
  )
}
