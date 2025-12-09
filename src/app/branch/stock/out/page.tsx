'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useProducts } from '@/hooks/useProducts'
import { useCurrentStock } from '@/hooks/useStock'
import { useStockOut } from '@/hooks/useStock'
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
import { ArrowLeft, Minus, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const stockOutSchema = z.object({
  product_id: z.string().min(1, 'Please select a product'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required'),
})

type StockOutFormValues = z.infer<typeof stockOutSchema>

function StockOutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const branchId = user?.branch_id
  const preSelectedProductId = searchParams.get('product_id')

  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: stockData } = useCurrentStock(branchId || '')
  const stockOut = useStockOut()

  const form = useForm<StockOutFormValues>({
    resolver: zodResolver(stockOutSchema),
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
  const quantityToRemove = form.watch('quantity') || 0
  const willBeSoldOut = currentQuantity - quantityToRemove <= 0

  const onSubmit = async (data: StockOutFormValues) => {
    if (!branchId) {
      toast.error('No branch assigned')
      return
    }

    if (data.quantity > currentQuantity) {
      toast.error(`Cannot remove more than available stock (${currentQuantity} ${selectedProduct?.unit})`)
      return
    }

    try {
      await stockOut.mutateAsync({
        branch_id: branchId,
        product_id: data.product_id,
        quantity: data.quantity,
        reason: data.reason,
      })
      
      toast.success(`Successfully removed ${data.quantity} ${selectedProduct?.unit || 'units'} of ${selectedProduct?.name}`)
      form.reset()
      router.push('/branch/stock')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove stock')
    }
  }

  if (!branchId) {
    return (
      <PageContainer title="Remove Stock">
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
      title="Remove Stock"
      description="Remove stock from your inventory"
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
              <Minus className="h-5 w-5 text-red-600" />
              Stock-Out Form
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
                          {products?.filter(p => p.is_active).map((product) => {
                            const stock = stockData?.find((item: any) => item.product_id === product.id)
                            const availableQty = stock?.quantity || 0
                            return (
                              <SelectItem 
                                key={product.id} 
                                value={product.id}
                                disabled={availableQty === 0}
                              >
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  <span>{product.name}</span>
                                  {product.sku && (
                                    <span className="text-gray-500 text-sm">({product.sku})</span>
                                  )}
                                  <span className="text-sm font-semibold">
                                    {availableQty > 0 ? `[${availableQty} available]` : '[Sold Out]'}
                                  </span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the product you want to remove stock from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProduct && (
                  <Card className={`border-2 ${currentQuantity === 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
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
                          <p className="text-sm text-gray-600">Available Stock</p>
                          <p className={`font-bold text-xl ${currentQuantity === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {currentQuantity} {selectedProduct.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Selling Price</p>
                          <p className="font-semibold text-lg">₹{selectedProduct.selling_price.toFixed(2)}</p>
                        </div>
                      </div>
                      {currentQuantity === 0 && (
                        <div className="mt-3 p-3 bg-red-100 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <p className="text-sm font-semibold text-red-800">
                            This product is already sold out!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Quantity to Remove <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={currentQuantity}
                          step="1"
                          className="h-12 text-lg"
                          placeholder="Enter quantity"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0
                            if (value > currentQuantity) {
                              toast.error(`Cannot remove more than ${currentQuantity} ${selectedProduct?.unit}`)
                              field.onChange(currentQuantity)
                            } else {
                              field.onChange(value)
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum available: {currentQuantity} {selectedProduct?.unit || 'units'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProduct && quantityToRemove > 0 && (
                  <Card className={`border-2 ${willBeSoldOut ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {willBeSoldOut ? (
                          <>
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-800">Stock After Removal:</span>
                          </>
                        ) : (
                          <span className="font-semibold">Stock After Removal:</span>
                        )}
                      </div>
                      <p className={`text-2xl font-bold ${willBeSoldOut ? 'text-red-700' : 'text-yellow-700'}`}>
                        {Math.max(0, currentQuantity - quantityToRemove)} {selectedProduct.unit}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Current: {currentQuantity} - Removing: {quantityToRemove}
                      </p>
                      {willBeSoldOut && (
                        <p className="text-sm font-semibold text-red-800 mt-2">
                          ⚠️ This will mark the product as sold out!
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Reason <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[100px] text-lg"
                          placeholder="e.g., Damaged goods, Returned to supplier, Stock adjustment, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Please provide a reason for removing this stock (required)
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
                    variant="destructive"
                    className="flex-1 gap-2"
                    disabled={stockOut.isPending || !selectedProduct || currentQuantity === 0}
                  >
                    {stockOut.isPending ? (
                      'Removing Stock...'
                    ) : (
                      <>
                        <Minus className="h-5 w-5" />
                        Remove Stock
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

export default function StockOutPage() {
  return (
    <Suspense fallback={
      <PageContainer title="Remove Stock">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading...</div>
          </CardContent>
        </Card>
      </PageContainer>
    }>
      <StockOutPageContent />
    </Suspense>
  )
}
