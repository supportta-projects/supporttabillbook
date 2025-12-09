'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCreateProduct } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useCategories'
import { useBrands } from '@/hooks/useBrands'
import { useBranches } from '@/hooks/useBranches'
import { useStockIn } from '@/hooks/useStock'
import { useAddSerialNumbers } from '@/hooks/useSerialNumbers'
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
import { ArrowLeft, Package, Tag, Boxes, Hash, TrendingUp, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Name is too long'),
  sku: z.string().optional(),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  selling_price: z.number().min(0.01, 'Selling price must be greater than 0'),
  purchase_price: z.number().min(0).optional().or(z.literal('')),
  min_stock: z.number().min(0).optional().or(z.literal('')),
  description: z.string().optional(),
  stock_tracking_type: z.enum(['quantity', 'serial']),
  is_active: z.boolean(),
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
  const tenantId = user?.tenant_id
  const createProduct = useCreateProduct()
  const { data: categories, isLoading: categoriesLoading } = useCategories(tenantId)
  const { data: brands, isLoading: brandsLoading } = useBrands(tenantId)
  const { data: branches, isLoading: branchesLoading } = useBranches(tenantId)
  const stockIn = useStockIn()
  const addSerialNumbers = useAddSerialNumbers()
  
  // Stock entry state
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [initialQuantity, setInitialQuantity] = useState<string>('')
  const [serialNumbers, setSerialNumbers] = useState<string[]>([''])
  const [addStockOnCreate, setAddStockOnCreate] = useState(false)
  
  // Set default branch to main branch
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      const mainBranch = branches.find(b => b.is_main && b.is_active)
      if (mainBranch) {
        setSelectedBranchId(mainBranch.id)
      } else {
        // If no main branch, use first active branch
        const firstActiveBranch = branches.find(b => b.is_active)
        if (firstActiveBranch) {
          setSelectedBranchId(firstActiveBranch.id)
        }
      }
    }
  }, [branches, selectedBranchId])

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      category_id: '',
      brand_id: '',
      unit: 'Pieces',
      selling_price: 0,
      purchase_price: '',
      min_stock: '',
      description: '',
      stock_tracking_type: 'quantity',
      is_active: true,
    },
  })

  const onSubmit = async (data: ProductFormValues) => {
    if (!tenantId) {
      toast.error('No tenant assigned. Please contact your administrator.')
      return
    }

    try {
      // Create product first
      const product = await createProduct.mutateAsync({
        tenant_id: tenantId,
        name: data.name.trim(),
        sku: data.sku?.trim() || undefined,
        category_id: data.category_id || undefined,
        brand_id: data.brand_id || undefined,
        unit: data.unit.trim(),
        selling_price: data.selling_price,
        purchase_price: typeof data.purchase_price === 'number' ? data.purchase_price : undefined,
        min_stock: typeof data.min_stock === 'number' ? data.min_stock : undefined,
        description: data.description?.trim() || undefined,
        stock_tracking_type: data.stock_tracking_type,
        is_active: data.is_active,
      })
      
      // Add stock if requested
      if (addStockOnCreate && selectedBranchId && product?.id) {
        if (data.stock_tracking_type === 'quantity') {
          // Add quantity-based stock
          if (initialQuantity && parseInt(initialQuantity) > 0) {
            try {
              await stockIn.mutateAsync({
                branch_id: selectedBranchId,
                product_id: product.id,
                quantity: parseInt(initialQuantity),
                reason: 'Initial stock entry',
              })
              toast.success(`Product created and ${initialQuantity} units added to stock!`)
            } catch (stockError: any) {
              toast.error(`Product created but failed to add stock: ${stockError.message}`)
            }
          }
        } else if (data.stock_tracking_type === 'serial') {
          // Add serial numbers
          const validSerials = serialNumbers.filter(s => s.trim() !== '')
          if (validSerials.length > 0) {
            try {
              await addSerialNumbers.mutateAsync({
                productId: product.id,
                branchId: selectedBranchId,
                serialNumbers: validSerials,
              })
              toast.success(`Product created and ${validSerials.length} serial number(s) added!`)
            } catch (serialError: any) {
              toast.error(`Product created but failed to add serial numbers: ${serialError.message}`)
            }
          }
        }
      }
      
      if (!addStockOnCreate || (data.stock_tracking_type === 'quantity' && !initialQuantity) || (data.stock_tracking_type === 'serial' && serialNumbers.filter(s => s.trim() !== '').length === 0)) {
        toast.success(`Product "${data.name}" created successfully!`)
      }
      
      form.reset()
      router.push('/owner/products')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product')
    }
  }

  const addSerialNumberField = () => {
    setSerialNumbers([...serialNumbers, ''])
  }

  const removeSerialNumberField = (index: number) => {
    if (serialNumbers.length > 1) {
      setSerialNumbers(serialNumbers.filter((_, i) => i !== index))
    } else {
      // If only one field, just clear it instead of removing
      setSerialNumbers([''])
    }
  }

  const updateSerialNumber = (index: number, value: string) => {
    const updated = [...serialNumbers]
    updated[index] = value
    setSerialNumbers(updated)
  }

  if (!tenantId) {
    return (
      <PageContainer title="Create Product">
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
      title="Create Product"
      description="Add a new product to your catalogue"
    >
      <div className="max-w-4xl">
        <Link href="/owner/products">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Basic Information
                  </h3>
                  
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
                            placeholder="e.g., Samsung Galaxy S23"
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
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">SKU (Stock Keeping Unit)</FormLabel>
                          <FormControl>
                            <Input
                              className="h-12 text-lg font-mono"
                              placeholder="e.g., SAM-GAL-S23-128"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Unique identifier for this product
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Catalogue Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Catalogue Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Category</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                            value={field.value || 'none'}
                            disabled={categoriesLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 text-lg">
                                <SelectValue placeholder="Select category (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Category</SelectItem>
                              {categories?.filter(c => c.is_active).map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Organize products by category
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brand_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Brand</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                            value={field.value || 'none'}
                            disabled={brandsLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 text-lg">
                                <SelectValue placeholder="Select brand (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Brand</SelectItem>
                              {brands?.filter(b => b.is_active).map((brand) => (
                                <SelectItem key={brand.id} value={brand.id}>
                                  {brand.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Product brand or manufacturer
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Pricing Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Pricing Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="selling_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">
                            Selling Price <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-12 text-lg"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purchase_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Purchase Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-12 text-lg"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                              value={field.value === '' ? '' : field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            Cost price for profit calculation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="min_stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Minimum Stock</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-12 text-lg"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
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
                </div>

                <Separator />

                {/* Stock Tracking */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Stock Tracking
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="stock_tracking_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Stock Tracking Type <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-lg">
                              <SelectValue placeholder="Select tracking type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="quantity">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-600" />
                                <span>Quantity (Count) - Track by total quantity</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="serial">
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-purple-600" />
                                <span>Serial Numbers - Track individual serial numbers</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose how to track inventory for this product. Quantity tracks total count, Serial Numbers tracks each item individually.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Initial Stock Entry */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Initial Stock Entry (Optional)
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="addStock"
                        checked={addStockOnCreate}
                        onChange={(e) => setAddStockOnCreate(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor="addStock" className="text-sm font-medium cursor-pointer">
                        Add stock now
                      </label>
                    </div>
                  </div>

                  {addStockOnCreate && (
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                      {/* Branch Selection */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">
                          Branch <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={selectedBranchId}
                          onValueChange={setSelectedBranchId}
                          disabled={branchesLoading}
                        >
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches?.filter(b => b.is_active).map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name} ({branch.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity-based stock entry */}
                      {form.watch('stock_tracking_type') === 'quantity' && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">
                            Initial Quantity <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            className="h-12 text-lg"
                            placeholder="Enter initial stock quantity"
                            value={initialQuantity}
                            onChange={(e) => setInitialQuantity(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the number of units to add to stock
                          </p>
                        </div>
                      )}

                      {/* Serial number-based stock entry */}
                      {form.watch('stock_tracking_type') === 'serial' && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">
                            Serial Numbers <span className="text-red-500">*</span>
                            <span className="text-xs font-normal text-gray-500 ml-2">
                              ({serialNumbers.filter(s => s.trim() !== '').length} entered)
                            </span>
                          </label>
                          <div className="space-y-2">
                            {serialNumbers.map((serial, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  className="h-12 text-lg"
                                  placeholder={`Serial number ${index + 1}`}
                                  value={serial}
                                  onChange={(e) => updateSerialNumber(index, e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-12 w-12"
                                  onClick={() => removeSerialNumberField(index)}
                                  disabled={serialNumbers.length === 1 && serial.trim() === ''}
                                  title={serialNumbers.length === 1 && serial.trim() === '' ? 'At least one field is required' : 'Remove'}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={addSerialNumberField}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Another Serial Number
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Enter individual serial numbers for each item. Empty fields will be ignored.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            className="text-lg"
                            placeholder="Product description, features, specifications..."
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
                            Product Status
                          </FormLabel>
                          <FormDescription>
                            Active products are visible in billing and stock management
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
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => router.back()}
                    disabled={createProduct.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={createProduct.isPending}
                  >
                    {createProduct.isPending ? 'Creating...' : 'Create Product'}
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
