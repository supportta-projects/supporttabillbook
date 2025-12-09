'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { useBranchStore } from '@/store/branchStore'
import { useProducts, useDeleteProduct, useToggleProductActive } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useCategories'
import { useBrands } from '@/hooks/useBrands'
import { useBranches } from '@/hooks/useBranches'
import { useCurrentStock, useStockIn, useStockOut } from '@/hooks/useStock'
import { useSerialNumbers, useAddSerialNumbers, useDeleteSerialNumber } from '@/hooks/useSerialNumbers'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  Tag,
  Boxes,
  AlertTriangle,
  Hash,
  Filter,
  X,
  MoreVertical,
  TrendingUp,
  Minus,
  TrendingDown,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import DeleteConfirmDialog from '@/components/modals/DeleteConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Product } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ProductsPage() {
  const { user, isLoading: authLoading } = useAuthStore()
  const { selectedBranchId } = useBranchStore()
  const tenantId = user?.tenant_id
  
  // Fetch user if not loaded
  const { isLoading: userLoading } = useCurrentUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  
  const { data: products, isLoading, error, refetch } = useProducts({
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    brand_id: brandFilter !== 'all' ? brandFilter : undefined,
    is_active: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
  })
  
  const { data: categories } = useCategories(tenantId)
  const { data: brands } = useBrands(tenantId)
  const { data: branches } = useBranches(tenantId)
  const deleteProduct = useDeleteProduct()
  const toggleActive = useToggleProductActive()
  const stockIn = useStockIn()
  const stockOut = useStockOut()
  const addSerialNumbers = useAddSerialNumbers()
  const deleteSerialNumber = useDeleteSerialNumber()
  const [quickAddStockOpen, setQuickAddStockOpen] = useState(false)
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null)
  const [stockQuantity, setStockQuantity] = useState<string>('1')
  const [newSerialNumber, setNewSerialNumber] = useState<string>('')
  
  // Set default branch to main branch if not set
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      const mainBranch = branches.find(b => b.is_main && b.is_active)
      if (mainBranch) {
        useBranchStore.getState().setSelectedBranch(mainBranch.id)
      }
    }
  }, [branches, selectedBranchId])
  
  // Get stock for selected branch only
  const { data: branchStock, refetch: refetchStock } = useCurrentStock(selectedBranchId || undefined, tenantId)
  
  // Get current stock for selected product in dialog
  const currentStockItem = branchStock?.find((item: any) => 
    item.product_id === selectedProductForStock?.id && item.branch_id === selectedBranchId
  )
  const currentQuantity = currentStockItem?.quantity || 0
  
  // Get serial numbers for serial-based products
  const { data: serialNumbers, refetch: refetchSerials } = useSerialNumbers(
    selectedProductForStock?.id || '',
    selectedBranchId || undefined,
    'available'
  )

  // Wait for auth to load before checking tenantId
  if (authLoading || userLoading) {
    return (
      <PageContainer title="Products">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!tenantId) {
    return (
      <PageContainer title="Products">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  // Filter products by search query
  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  // Calculate stock for each product (filtered by selected branch)
  interface StockItem {
    product_id: string
    quantity: number
    branch_id?: string
    branch_name?: string
  }
  
  const productsWithStock = filteredProducts.map(product => {
    const stockArray: StockItem[] = Array.isArray(branchStock) ? branchStock as StockItem[] : []
    // Filter stock for selected branch only
    const productStock = stockArray.filter((s: StockItem) => 
      s.product_id === product.id && (!selectedBranchId || s.branch_id === selectedBranchId)
    )
    const branchQuantity = productStock.find(s => s.branch_id === selectedBranchId)?.quantity || 0
    
    return {
      ...product,
      branchStock: branchQuantity,
      stockByBranch: productStock,
      isLowStock: product.min_stock > 0 && branchQuantity <= product.min_stock && branchQuantity > 0,
      isSoldOut: branchQuantity === 0,
    }
  })

  const handleDelete = async () => {
    if (!productToDelete) return

    try {
      await deleteProduct.mutateAsync(productToDelete.id)
      toast.success(`Product "${productToDelete.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product')
    }
  }

  const handleToggleActive = async (product: Product) => {
    try {
      await toggleActive.mutateAsync({
        id: product.id,
        is_active: !product.is_active,
      })
      toast.success(`Product "${product.name}" ${!product.is_active ? 'enabled' : 'disabled'} successfully`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update product status')
    }
  }

  const handleAddSerial = async () => {
    if (!selectedBranchId || !newSerialNumber.trim() || !selectedProductForStock) {
      toast.error('Please select a branch and enter a serial number')
      return
    }

    try {
      await addSerialNumbers.mutateAsync({
        productId: selectedProductForStock.id,
        branchId: selectedBranchId,
        serialNumbers: [newSerialNumber.trim()],
      })
      toast.success(`Serial number "${newSerialNumber.trim()}" added successfully`)
      setNewSerialNumber('')
      refetchSerials()
      refetchStock() // Refetch stock to update count in table
      refetch() // Refetch products
    } catch (error: any) {
      toast.error(error.message || 'Failed to add serial number')
    }
  }
  
  // Show warning if no branch selected
  if (!selectedBranchId && branches && branches.length > 0) {
    return (
      <PageContainer
        title="Products"
        description="Manage your product catalogue and inventory"
        actions={
          <Link href="/owner/products/create">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Add Product
            </Button>
          </Link>
        }
      >
        <Card>
          <CardContent className="p-6 text-center">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-medium mb-2">Please select a branch to view products</p>
              <p className="text-sm text-yellow-700">Use the branch switcher in the header to select a branch.</p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const totalProducts = productsWithStock.length
  const activeProducts = productsWithStock.filter(p => p.is_active).length
  const inactiveProducts = productsWithStock.filter(p => !p.is_active).length
  const lowStockProducts = productsWithStock.filter(p => p.isLowStock).length
  const soldOutProducts = productsWithStock.filter(p => p.isSoldOut).length

  const hasActiveFilters = categoryFilter !== 'all' || brandFilter !== 'all' || statusFilter !== 'all' || searchQuery !== ''

  // Pagination calculations
  const totalPages = Math.ceil(productsWithStock.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = productsWithStock.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, brandFilter, statusFilter, searchQuery])

  const clearFilters = () => {
    setCategoryFilter('all')
    setBrandFilter('all')
    setStatusFilter('all')
    setSearchQuery('')
  }

  const currentBranch = branches?.find(b => b.id === selectedBranchId)

  return (
    <PageContainer
      title="Products"
      description={currentBranch ? `Managing products for ${currentBranch.name}` : "Manage your product catalogue"}
      actions={
        <Link href="/owner/products/create">
          <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5" />
            Add Product
          </Button>
        </Link>
      }
    >
      {/* Branch Info Banner */}
      {currentBranch && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-semibold text-blue-900">Viewing: {currentBranch.name}</div>
              <div className="text-sm text-blue-700">Stock and inventory shown for this branch only</div>
            </div>
          </div>
          {currentBranch.is_main && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">Main Branch</span>
          )}
        </div>
      )}

      {/* Statistics Cards - Simplified */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Products</div>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Active</div>
            <div className="text-2xl font-bold text-green-600">{activeProducts}</div>
          </CardContent>
        </Card>
        
        <Card className={`border-l-4 ${lowStockProducts > 0 ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-yellow-300'}`}>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low Stock
            </div>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts}</div>
          </CardContent>
        </Card>
        
        <Card className={`border-l-4 ${soldOutProducts > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-red-300'}`}>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Sold Out
            </div>
            <div className="text-2xl font-bold text-red-600">{soldOutProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search */}
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="All Categories" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.filter(c => c.is_active).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div className="w-full md:w-48">
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="All Brands" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands?.filter(b => b.is_active).map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-10 gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading products...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <p className="font-semibold mb-2">Error loading products</p>
              <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
            </div>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : productsWithStock.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first product'}
            </p>
            <Link href="/owner/products/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[300px] font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold text-right">Price</TableHead>
                  <TableHead className="font-semibold text-right">Stock</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow 
                    key={product.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      product.isSoldOut ? 'bg-red-50/50' : 
                      product.isLowStock ? 'bg-yellow-50/50' : ''
                    }`}
                  >
                    {/* Product Info */}
                    <TableCell>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 mb-1 truncate">
                          {product.name}
                        </div>
                        {product.sku && (
                          <div className="text-xs text-gray-500 font-mono">
                            SKU: {product.sku}
                          </div>
                        )}
                        {product.stock_tracking_type === 'serial' && (
                          <div className="flex items-center gap-1 mt-1">
                            <Hash className="h-3 w-3 text-purple-600" />
                            <span className="text-xs text-purple-600 font-medium">Serial Tracking</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      {product.category ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <div className="font-semibold text-gray-900 text-lg">
                        ₹{Number(product.selling_price).toLocaleString('en-IN')}
                      </div>
                    </TableCell>

                    {/* Stock */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <div className={`text-xl font-bold ${
                            product.isSoldOut ? 'text-red-600' : 
                            product.isLowStock ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {product.branchStock}
                          </div>
                          <div className="text-xs text-gray-500">{product.unit}</div>
                          {product.isSoldOut && (
                            <span className="inline-block mt-1 text-xs text-red-600 font-medium">Sold Out</span>
                          )}
                          {product.isLowStock && !product.isSoldOut && (
                            <span className="inline-block mt-1 text-xs text-yellow-600 font-medium">Low Stock</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            if (!selectedBranchId) {
                              toast.error('Please select a branch first')
                              return
                            }
                            setSelectedProductForStock(product)
                            setStockQuantity('1')
                            setNewSerialNumber('')
                            setQuickAddStockOpen(true)
                          }}
                          disabled={!selectedBranchId}
                          title="Manage Stock"
                        >
                          <TrendingUp className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {product.is_active ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/owner/products/${product.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="h-4 w-4" />
                              Edit Product
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(product)}
                            disabled={toggleActive.isPending}
                            className="cursor-pointer"
                          >
                            {product.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Disable Product
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Enable Product
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProductToDelete(product)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-600 cursor-pointer focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(endIndex, productsWithStock.length)}</span> of{' '}
                <span className="font-semibold">{productsWithStock.length}</span> products
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-9 w-9 ${currentPage === pageNum ? 'bg-blue-600 text-white' : ''}`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        isLoading={deleteProduct.isPending}
      />

      {/* Quick Stock Management Dialog */}
      {quickAddStockOpen && selectedProductForStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setQuickAddStockOpen(false)
          setSelectedProductForStock(null)
          setStockQuantity('1')
          setNewSerialNumber('')
        }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Stock</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setQuickAddStockOpen(false)
                  setSelectedProductForStock(null)
                  setStockQuantity('1')
                  setNewSerialNumber('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Product</label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="font-semibold">{selectedProductForStock.name}</div>
                  {selectedProductForStock.sku && (
                    <div className="text-xs text-gray-500 font-mono">SKU: {selectedProductForStock.sku}</div>
                  )}
                  {selectedProductForStock.stock_tracking_type === 'serial' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Hash className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-purple-600 font-medium">Serial Number Tracking</span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedBranchId && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Branch</label>
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <div className="font-semibold text-blue-900">
                      {branches?.find(b => b.id === selectedBranchId)?.name}
                      {branches?.find(b => b.id === selectedBranchId)?.is_main && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Main</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!selectedBranchId ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-yellow-800">Please select a branch from the header to manage stock.</p>
                </div>
              ) : (
                <>
              {/* Quantity-based Stock Management */}
              {selectedProductForStock.stock_tracking_type === 'quantity' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Current Stock</label>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                    <div className="text-2xl font-bold text-blue-600 text-center">
                      {currentQuantity} {selectedProductForStock.unit}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Adjust Quantity</label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={async () => {
                          if (!selectedBranchId || currentQuantity <= 0) {
                            toast.error('Cannot decrease stock below 0')
                            return
                          }
                          try {
                            await stockOut.mutateAsync({
                              branch_id: selectedBranchId,
                              product_id: selectedProductForStock.id,
                              quantity: parseInt(stockQuantity) || 1,
                              reason: 'Stock adjustment from products page',
                            })
                            toast.success(`Successfully decreased ${parseInt(stockQuantity) || 1} ${selectedProductForStock.unit}`)
                            refetchStock()
                            refetch()
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to decrease stock')
                          }
                        }}
                        disabled={stockOut.isPending || currentQuantity <= 0 || !selectedBranchId}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <Input
                        type="number"
                        min="1"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        className="h-10 flex-1 text-center font-semibold"
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={async () => {
                          if (!selectedBranchId || !stockQuantity || parseInt(stockQuantity) <= 0) {
                            toast.error('Please enter a valid quantity')
                            return
                          }
                          try {
                            await stockIn.mutateAsync({
                              branch_id: selectedBranchId,
                              product_id: selectedProductForStock.id,
                              quantity: parseInt(stockQuantity),
                              reason: 'Stock adjustment from products page',
                            })
                            toast.success(`Successfully added ${stockQuantity} ${selectedProductForStock.unit}`)
                            refetchStock()
                            refetch()
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to add stock')
                          }
                        }}
                        disabled={stockIn.isPending || !stockQuantity || !selectedBranchId}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Click + to add or - to remove stock
                    </p>
                  </div>
                </div>
              )}

              {/* Serial Number-based Stock Management */}
              {selectedProductForStock.stock_tracking_type === 'serial' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Serial Numbers</label>
                  
                  {/* Existing Serial Numbers */}
                  {serialNumbers && serialNumbers.length > 0 ? (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">Available Serial Numbers ({serialNumbers.length}):</div>
                      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                        {serialNumbers.map((serial) => (
                          <div
                            key={serial.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            <span>{serial.serial_number}</span>
                            <button
                              onClick={async () => {
                                try {
                                  await deleteSerialNumber.mutateAsync({
                                    productId: selectedProductForStock.id,
                                    serialId: serial.id,
                                  })
                                  toast.success(`Serial number ${serial.serial_number} removed`)
                                  refetchSerials()
                                  refetchStock() // Refetch stock to update count in table
                                  refetch() // Refetch products
                                } catch (error: any) {
                                  toast.error(error.message || 'Failed to remove serial number')
                                }
                              }}
                              disabled={deleteSerialNumber.isPending}
                              className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                              title="Remove serial number"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
                      No serial numbers added yet. Add your first serial number below.
                    </div>
                  )}

                  {/* Add New Serial Number */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Add New Serial Number</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter serial number"
                        value={newSerialNumber}
                        onChange={(e) => setNewSerialNumber(e.target.value)}
                        className="h-10 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSerialNumber.trim()) {
                            handleAddSerial()
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddSerial}
                        disabled={addSerialNumbers.isPending || !newSerialNumber.trim()}
                        className="h-10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setQuickAddStockOpen(false)
                  setSelectedProductForStock(null)
                  setStockQuantity('1')
                  setNewSerialNumber('')
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
