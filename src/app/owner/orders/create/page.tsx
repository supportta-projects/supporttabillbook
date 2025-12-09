'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { useBranches } from '@/hooks/useBranches'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'
import { useProducts } from '@/hooks/useProducts'
import { useSerialNumbers } from '@/hooks/useSerialNumbers'
import { useSettings } from '@/hooks/useSettings'
import { useCreateBill } from '@/hooks/useBills'
import { useCurrentStock } from '@/hooks/useStock'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Product, Customer, ProductSerialNumber } from '@/types'
import { 
  Plus, 
  X, 
  ShoppingCart, 
  User, 
  Package, 
  Search,
  Hash,
  Trash2,
  Loader2,
  Building2,
  Receipt
} from 'lucide-react'
import { toast } from 'sonner'

interface CartItem {
  product: Product
  quantity: number
  selectedSerials?: string[] // For serial-tracked products
  unitPrice: number
  discount: number
  availableStock: number // Cached stock when added to cart
}

export default function CreateOrderPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { selectedBranchId } = useBranchStore()
  const tenantId = user?.tenant_id
  
  // State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash')
  const [overallDiscount, setOverallDiscount] = useState<string>('')
  const [selectedProductForSerials, setSelectedProductForSerials] = useState<Product | null>(null)
  const [showSerialDialog, setShowSerialDialog] = useState(false)
  
  // Hooks
  const { data: branches } = useBranches(tenantId)
  const { data: customers } = useCustomers({ is_active: true })
  const { data: products } = useProducts({ is_active: true })
  const { data: settings } = useSettings()
  const { data: branchStock } = useCurrentStock(selectedBranchId || undefined, tenantId)
  const createCustomer = useCreateCustomer()
  const createBill = useCreateBill()
  
  // Set default branch
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      const mainBranch = branches.find(b => b.is_main && b.is_active)
      if (mainBranch) {
        useBranchStore.getState().setSelectedBranch(mainBranch.id)
      }
    }
  }, [branches, selectedBranchId])
  
  // Filter products by search - memoized for performance
  // Show only 5 latest products initially, max 10 when searching
  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!productSearch.trim()) return products.slice(0, 5) // Show only 5 latest products
    
    const searchLower = productSearch.toLowerCase().trim()
    return products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.sku?.toLowerCase().includes(searchLower)
    ).slice(0, 10) // Max 10 products when searching
  }, [products, productSearch])
  
  // Get selected customer - memoized for performance
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId || !customers) return undefined
    return customers.find(c => c.id === selectedCustomerId)
  }, [selectedCustomerId, customers])
  
  // Calculate totals - memoized for performance
  const totals = useMemo(() => {
    if (cart.length === 0) {
      return {
        subtotal: 0,
        discount: 0,
        gstAmount: 0,
        totalAmount: 0,
        profit: 0,
      }
    }
    
    let subtotal = 0
    let totalDiscount = 0
    let totalProfit = 0
    
    cart.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice
      subtotal += itemSubtotal
      totalDiscount += item.discount || 0
      
      // Calculate profit
      const purchasePrice = item.product.purchase_price || 0
      const profitPerUnit = item.unitPrice - purchasePrice
      totalProfit += profitPerUnit * item.quantity
    })
    
    // Add overall discount
    const overallDiscountValue = parseFloat(overallDiscount) || 0
    totalDiscount += overallDiscountValue
    
    // Calculate GST from settings
    let gstAmount = 0
    let totalAmount = subtotal - totalDiscount
    
    if (settings?.gst_enabled && settings.gst_percentage > 0) {
      if (settings.gst_type === 'inclusive') {
        // GST is included in price
        gstAmount = totalAmount * (settings.gst_percentage / (100 + settings.gst_percentage))
        // totalAmount stays the same (already includes GST)
      } else {
        // GST is exclusive (added on top)
        gstAmount = totalAmount * (settings.gst_percentage / 100)
        totalAmount = totalAmount + gstAmount
      }
    }
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(totalDiscount * 100) / 100,
      overallDiscount: Math.round(overallDiscountValue * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      profit: Math.round(totalProfit * 100) / 100,
    }
  }, [cart, settings, overallDiscount])
  
  // Handle add customer
  const handleAddCustomer = async () => {
    if (!customerName.trim()) {
      toast.error('Customer name is required')
      return
    }
    
    try {
      const newCustomer = await createCustomer.mutateAsync({
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
      })
      setSelectedCustomerId(newCustomer.customer.id)
      setCustomerName('')
      setCustomerPhone('')
      setShowAddCustomer(false)
      toast.success('Customer added successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add customer')
    }
  }
  
  // Handle add product to cart
  const handleAddProduct = (product: Product) => {
    if (!selectedBranchId) {
      toast.error('Please select a branch first')
      return
    }
    
    // Get current stock for this product (cache it)
    const stockItem = branchStock?.find((s: any) => 
      s.product_id === product.id && s.branch_id === selectedBranchId
    )
    const availableStock = stockItem?.quantity || 0
    
    // Check stock availability
    if (product.stock_tracking_type === 'quantity' && availableStock === 0) {
      toast.error(`${product.name} is out of stock`)
      return
    }
    
    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.product.id === product.id)
    
    if (product.stock_tracking_type === 'serial') {
      // Open serial selection dialog
      setSelectedProductForSerials(product)
      setShowSerialDialog(true)
    } else {
      // Quantity-based product
      if (existingIndex >= 0) {
        // Update quantity - check against cached stock
        const cartItem = cart[existingIndex]
        const newQuantity = cartItem.quantity + 1
        
        if (newQuantity > cartItem.availableStock) {
          toast.error(`Insufficient stock for ${product.name}. Available: ${cartItem.availableStock}`)
          return
        }
        
        const updatedCart = [...cart]
        updatedCart[existingIndex].quantity = newQuantity
        setCart(updatedCart)
      } else {
        // Add new item with cached stock
        if (availableStock === 0) {
          toast.error(`${product.name} is out of stock`)
          return
        }
        
        setCart([...cart, {
          product,
          quantity: 1,
          unitPrice: product.selling_price,
          discount: 0,
          availableStock, // Cache the stock when adding
        }])
      }
      toast.success(`${product.name} added to cart`)
    }
  }
  
  // Handle serial number selection
  const handleSelectSerials = (serials: string[]) => {
    if (!selectedProductForSerials || serials.length === 0) {
      setShowSerialDialog(false)
      setSelectedProductForSerials(null)
      return
    }
    
    // Get current stock for serial numbers (count available serials)
    const serialStockItem = branchStock?.find((s: any) => 
      s.product_id === selectedProductForSerials.id && s.branch_id === selectedBranchId
    )
    const availableSerialCount = serialStockItem?.quantity || 0
    
    // Validate serial count
    if (serials.length > availableSerialCount) {
      toast.error(`Only ${availableSerialCount} serial numbers available for ${selectedProductForSerials.name}`)
      return
    }
    
    const existingIndex = cart.findIndex(item => item.product.id === selectedProductForSerials.id)
    
    if (existingIndex >= 0) {
      // Update existing item
      const updatedCart = [...cart]
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: serials.length,
        selectedSerials: serials,
        availableStock: availableSerialCount, // Update cached stock
      }
      setCart(updatedCart)
    } else {
      // Add new item with cached stock
      setCart([...cart, {
        product: selectedProductForSerials,
        quantity: serials.length,
        selectedSerials: serials,
        unitPrice: selectedProductForSerials.selling_price,
        discount: 0,
        availableStock: availableSerialCount, // Cache the stock when adding
      }])
    }
    
    setShowSerialDialog(false)
    const productName = selectedProductForSerials.name
    setSelectedProductForSerials(null)
    toast.success(`${serials.length} ${productName} added to cart`)
  }
  
  // Handle remove from cart
  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }
  
  // Handle update cart item
  const handleUpdateCartItem = (index: number, updates: Partial<CartItem>) => {
    const cartItem = cart[index]
    const updatedCart = [...cart]
    
    // If updating quantity, validate against cached stock
    if (updates.quantity !== undefined) {
      const newQuantity = updates.quantity
      
      if (newQuantity <= 0) {
        toast.error('Quantity must be greater than 0')
        return
      }
      
      if (newQuantity > cartItem.availableStock) {
        toast.error(`Insufficient stock. Available: ${cartItem.availableStock}`)
        return
      }
    }
    
    // If updating unitPrice or discount, ensure valid values
    if (updates.unitPrice !== undefined && updates.unitPrice < 0) {
      toast.error('Price cannot be negative')
      return
    }
    
    if (updates.discount !== undefined && updates.discount < 0) {
      toast.error('Discount cannot be negative')
      return
    }
    
    updatedCart[index] = { ...updatedCart[index], ...updates }
    setCart(updatedCart)
  }
  
  // Handle create order
  const handleCreateOrder = async () => {
    if (!selectedBranchId) {
      toast.error('Please select a branch first')
      return
    }
    
    if (cart.length === 0) {
      toast.error('Please add at least one product to cart')
      return
    }
    
    // Validate cart items
    for (const item of cart) {
      if (!item.product || !item.product.id) {
        toast.error('Invalid product in cart. Please refresh and try again.')
        return
      }
      
      if (item.quantity <= 0) {
        toast.error(`Invalid quantity for ${item.product.name}. Quantity must be greater than 0.`)
        return
      }
      
      // For serial-tracked products, validate serials
      if (item.product.stock_tracking_type === 'serial') {
        if (!item.selectedSerials || item.selectedSerials.length === 0) {
          toast.error(`Please select serial numbers for ${item.product.name}`)
          return
        }
        if (item.selectedSerials.length !== item.quantity) {
          toast.error(`Quantity mismatch for ${item.product.name}. Selected ${item.selectedSerials.length} serials but quantity is ${item.quantity}`)
          return
        }
      } else {
        // Quantity-based stock validation - use cached stock
        if (item.quantity > item.availableStock) {
          toast.error(`Insufficient stock for ${item.product.name}. Available: ${item.availableStock}, Required: ${item.quantity}`)
          return
        }
      }
    }
    
    try {
      // Prepare bill items
      const billItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        purchase_price: item.product.purchase_price || 0,
        discount: item.discount || 0,
        serial_numbers: item.selectedSerials || [],
      }))
      
      console.log('[Order] Creating order with:', {
        branch_id: selectedBranchId,
        items_count: billItems.length,
        customer_id: selectedCustomerId || null,
        payment_mode: paymentMode,
      })
      
      // Create bill
      const result = await createBill.mutateAsync({
        branch_id: selectedBranchId,
        items: billItems,
        customer_id: selectedCustomerId || undefined,
        customer_name: selectedCustomer?.name || customerName || undefined,
        customer_phone: selectedCustomer?.phone || customerPhone || undefined,
        payment_mode: paymentMode,
        overall_discount: parseFloat(overallDiscount) || 0,
      })
      
      console.log('[Order] Order created successfully:', result.bill.id)
      toast.success('Order created successfully!')
      router.push('/owner/orders')
    } catch (error: any) {
      console.error('[Order] Failed to create order:', error)
      const errorMessage = error?.message || error?.error || 'Failed to create order. Please try again.'
      toast.error(errorMessage)
    }
  }
  
  if (!tenantId) {
    return (
      <PageContainer title="Create Order">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }
  
  if (!selectedBranchId && branches && branches.length > 0) {
    return (
      <PageContainer title="Create Order">
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Branch</h3>
            <p className="text-gray-600">Please select a branch from the header to create an order.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }
  
  return (
    <PageContainer
      title="Create Order"
      description="Create a new sales order and generate invoice"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select 
                  value={selectedCustomerId || 'none'} 
                  onValueChange={(val) => setSelectedCustomerId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select customer or walk-in" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Walk-in Customer</SelectItem>
                    {customers?.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Name *</label>
                        <Input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Customer name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Phone</label>
                        <Input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Phone number"
                        />
                      </div>
                      <Button 
                        onClick={handleAddCustomer}
                        disabled={createCustomer.isPending || !customerName.trim()}
                        className="w-full"
                      >
                        {createCustomer.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Customer'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {selectedCustomer && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-900">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-blue-700">{selectedCustomer.phone}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Add Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="font-semibold">No products found</p>
                  <p className="text-sm">
                    {productSearch.trim() 
                      ? 'Try adjusting your search' 
                      : 'No products available. Add products in the Products section.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProducts.map(product => {
                  const stockItem = branchStock?.find((s: any) => 
                    s.product_id === product.id && s.branch_id === selectedBranchId
                  )
                  const availableStock = stockItem?.quantity || 0
                  const cartItem = cart.find(item => item.product.id === product.id)
                  const isInCart = !!cartItem
                  const cartQuantity = cartItem?.quantity || 0
                  
                  return (
                    <div
                      key={product.id}
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        isInCart ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          ₹{product.selling_price.toLocaleString('en-IN')} / {product.unit}
                          {product.stock_tracking_type === 'serial' && (
                            <span className="ml-2 inline-flex items-center gap-1 text-purple-600">
                              <Hash className="h-3 w-3" />
                              Serial
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Stock: {availableStock} {product.unit}
                          {isInCart && cartItem && (
                            <span className="ml-2 text-green-600 font-semibold">
                              (In cart: {cartQuantity}, Available: {cartItem.availableStock})
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddProduct(product)}
                        disabled={
                          availableStock === 0 || 
                          (isInCart && cartItem && cartQuantity >= cartItem.availableStock)
                        }
                        variant={isInCart ? 'outline' : 'default'}
                      >
                        {isInCart 
                          ? (cartItem && cartQuantity >= cartItem.availableStock ? 'Max Stock' : 'Add More')
                          : availableStock === 0 
                          ? 'Out of Stock' 
                          : 'Add'}
                      </Button>
                    </div>
                  )
                })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Cart & Summary */}
        <div className="space-y-6">
          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{item.product.name}</div>
                          {item.selectedSerials && item.selectedSerials.length > 0 && (
                            <div className="text-xs text-purple-600 mt-1">
                              {item.selectedSerials.length} serial{item.selectedSerials.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFromCart(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {item.product.stock_tracking_type === 'quantity' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => handleUpdateCartItem(index, { 
                                quantity: Math.max(1, item.quantity - 1) 
                              })}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1
                                if (newQty > item.availableStock) {
                                  toast.error(`Maximum ${item.availableStock} available`)
                                  return
                                }
                                handleUpdateCartItem(index, { quantity: newQty })
                              }}
                              className="h-7 w-16 text-center text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              disabled={item.quantity >= item.availableStock}
                              onClick={() => handleUpdateCartItem(index, { 
                                quantity: item.quantity + 1 
                              })}
                            >
                              +
                            </Button>
                            <span className="text-xs text-gray-500 ml-2">
                              × ₹{item.unitPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Available: {item.availableStock} {item.product.unit}
                          </div>
                          {/* Price and Discount Editing */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Price (₹)</label>
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0
                                  if (newPrice >= 0) {
                                    handleUpdateCartItem(index, { unitPrice: newPrice })
                                  }
                                }}
                                className="h-7 text-xs"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Discount (₹)</label>
                              <Input
                                type="number"
                                value={item.discount || 0}
                                onChange={(e) => {
                                  const newDiscount = parseFloat(e.target.value) || 0
                                  if (newDiscount >= 0) {
                                    handleUpdateCartItem(index, { discount: newDiscount })
                                  }
                                }}
                                className="h-7 text-xs"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {item.product.stock_tracking_type === 'serial' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => {
                              setSelectedProductForSerials(item.product)
                              setShowSerialDialog(true)
                            }}
                          >
                            <Hash className="h-3 w-3 mr-2" />
                            Select Serial Numbers ({item.quantity})
                          </Button>
                          {/* Price and Discount Editing for Serial Products */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Price (₹)</label>
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0
                                  if (newPrice >= 0) {
                                    handleUpdateCartItem(index, { unitPrice: newPrice })
                                  }
                                }}
                                className="h-7 text-xs"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Discount (₹)</label>
                              <Input
                                type="number"
                                value={item.discount || 0}
                                onChange={(e) => {
                                  const newDiscount = parseFloat(e.target.value) || 0
                                  if (newDiscount >= 0) {
                                    handleUpdateCartItem(index, { discount: newDiscount })
                                  }
                                }}
                                className="h-7 text-xs"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div className="mt-2 flex justify-between text-sm">
                        <span>Total:</span>
                        <span className="font-semibold">
                          ₹{((item.quantity * item.unitPrice) - (item.discount || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Order Summary */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {totals.discount > 0 && (
                  <>
                    {(totals.overallDiscount || 0) > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Overall Discount:</span>
                        <span>-₹{(totals.overallDiscount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Total Discount:</span>
                      <span>-₹{totals.discount.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                {/* Overall Discount Input */}
                <div className="pt-2">
                  <label className="text-sm font-medium mb-1 block">Overall Discount (₹)</label>
                  <Input
                    type="number"
                    value={overallDiscount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setOverallDiscount(value)
                      }
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={totals.subtotal}
                  />
                </div>
                {settings?.gst_enabled && totals.gstAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>GST ({settings.gst_percentage}%):</span>
                    <span>₹{totals.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-lg">₹{totals.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600 pt-2 border-t">
                  <span>Profit:</span>
                  <span className="font-semibold">₹{totals.profit.toLocaleString('en-IN')}</span>
                </div>
                
                {/* Payment Mode */}
                <div className="pt-4">
                  <label className="text-sm font-medium mb-2 block">Payment Mode</label>
                  <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={handleCreateOrder}
                  disabled={createBill.isPending || cart.length === 0}
                  className="w-full mt-4"
                  size="lg"
                >
                  {createBill.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Create Order
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Serial Number Selection Dialog */}
      {selectedProductForSerials && (
        <SerialNumberDialog
          product={selectedProductForSerials}
          branchId={selectedBranchId || ''}
          open={showSerialDialog}
          onOpenChange={setShowSerialDialog}
          onSelect={handleSelectSerials}
          existingSerials={cart.find(item => item.product.id === selectedProductForSerials.id)?.selectedSerials || []}
        />
      )}
    </PageContainer>
  )
}

// Serial Number Selection Dialog Component
function SerialNumberDialog({
  product,
  branchId,
  open,
  onOpenChange,
  onSelect,
  existingSerials = [],
}: {
  product: Product
  branchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (serials: string[]) => void
  existingSerials?: string[]
}) {
  const [selectedSerials, setSelectedSerials] = useState<string[]>(existingSerials)
  const { data: serialNumbers } = useSerialNumbers(product.id, branchId, 'available')
  
  useEffect(() => {
    if (open) {
      setSelectedSerials(existingSerials)
    }
  }, [open, existingSerials])
  
  const toggleSerial = (serial: string) => {
    setSelectedSerials(prev => 
      prev.includes(serial)
        ? prev.filter(s => s !== serial)
        : [...prev, serial]
    )
  }
  
  const handleConfirm = () => {
    if (selectedSerials.length === 0) {
      toast.error('Please select at least one serial number')
      return
    }
    onSelect(selectedSerials)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Serial Numbers - {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Select serial numbers to add to cart. Quantity will be based on selected serials.
          </div>
          
          {serialNumbers && serialNumbers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {serialNumbers.map((serial: ProductSerialNumber) => (
                <button
                  key={serial.id}
                  onClick={() => toggleSerial(serial.serial_number)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedSerials.includes(serial.serial_number)
                      ? 'bg-blue-100 border-blue-500 text-blue-900'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-mono text-sm">{serial.serial_number}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Hash className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No available serial numbers</p>
            </div>
          )}
          
          {selectedSerials.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-semibold text-blue-900 mb-2">
                Selected: {selectedSerials.length} serial{selectedSerials.length > 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSerials.map(serial => (
                  <span
                    key={serial}
                    className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-mono"
                  >
                    {serial}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1" disabled={selectedSerials.length === 0}>
              Add {selectedSerials.length} to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

