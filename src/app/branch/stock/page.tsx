'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCurrentStock } from '@/hooks/useStock'
import { useProducts } from '@/hooks/useProducts'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import Link from 'next/link'
import { 
  Package, 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  TrendingDown,
  Eye,
  ShoppingCart
} from 'lucide-react'
import { toast } from 'sonner'

interface StockItem {
  id: string | null
  product_id: string
  product: {
    id: string
    name: string
    sku: string | null
    unit: string
    selling_price: number
    min_stock: number
  }
  quantity: number
  remaining_stock: number
  is_sold_out: boolean
  sold_out_details: Array<{
    invoice_number: string
    sold_date: string
    quantity_sold: number
    customer_name: string
  }>
  updated_at: string
}

export default function StockListPage() {
  const { user } = useAuthStore()
  const branchId = user?.branch_id
  
  const { data: stockData, isLoading, error, refetch } = useCurrentStock(branchId || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSoldOutOnly, setShowSoldOutOnly] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null)
  
  // Type assertion: API returns StockItem[] structure
  const stockItems = (stockData as unknown as StockItem[]) || []

  if (!branchId) {
    return (
      <PageContainer title="Stock Management">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No branch assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  
  // Filter stock items
  const filteredStock = stockItems.filter(item => {
    const matchesSearch = item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = showSoldOutOnly ? item.is_sold_out : true
    return matchesSearch && matchesFilter
  })

  // Calculate statistics
  const totalProducts = stockItems.length
  const inStockProducts = stockItems.filter(item => !item.is_sold_out).length
  const soldOutProducts = stockItems.filter(item => item.is_sold_out).length
  const lowStockProducts = stockItems.filter(item => 
    !item.is_sold_out && item.product.min_stock > 0 && item.quantity <= item.product.min_stock
  ).length

  const getStockStatus = (item: StockItem) => {
    if (item.is_sold_out) {
      return { label: 'Sold Out', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle }
    }
    if (item.product.min_stock > 0 && item.quantity <= item.product.min_stock) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: TrendingDown }
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle }
  }

  return (
    <PageContainer
      title="Stock Management"
      description="View and manage your inventory stock levels"
      actions={
        <div className="flex gap-2">
          <Link href="/branch/stock/in">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Add Stock
            </Button>
          </Link>
          <Link href="/branch/products/create">
            <Button size="lg" variant="outline" className="gap-2">
              <Package className="h-5 w-5" />
              Add Product
            </Button>
          </Link>
        </div>
      }
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{inStockProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Sold Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{soldOutProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{lowStockProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button
              variant={showSoldOutOnly ? "default" : "outline"}
              onClick={() => setShowSoldOutOnly(!showSoldOutOnly)}
              className="h-12"
            >
              {showSoldOutOnly ? 'Show All' : 'Show Sold Out Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading stock data...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600">Error loading stock: {error.message}</div>
            <Button onClick={() => refetch()} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      ) : filteredStock.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || showSoldOutOnly 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first product'}
            </p>
            <Link href="/branch/products/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStock.map((item) => {
            const status = getStockStatus(item)
            const StatusIcon = status.icon

            return (
              <Card key={item.product_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {item.product.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </div>
                          {item.product.sku && (
                            <p className="text-sm text-gray-500 mb-2">
                              SKU: <span className="font-mono">{item.product.sku}</span>
                            </p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-600">Remaining Stock</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {item.remaining_stock}
                                <span className="text-sm font-normal text-gray-500 ml-1">
                                  {item.product.unit}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Selling Price</p>
                              <p className="text-lg font-semibold text-gray-900">
                                ₹{item.product.selling_price.toFixed(2)}
                              </p>
                            </div>
                            {item.product.min_stock > 0 && (
                              <div>
                                <p className="text-sm text-gray-600">Min. Stock</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {item.product.min_stock} {item.product.unit}
                                </p>
                              </div>
                            )}
                            {item.sold_out_details.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-600">Total Sold</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {item.sold_out_details.reduce((sum, detail) => sum + detail.quantity_sold, 0)}
                                  <span className="text-sm font-normal text-gray-500 ml-1">
                                    {item.product.unit}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">
                      <Link href={`/branch/stock/in?product_id=${item.product_id}`}>
                        <Button className="w-full gap-2" size="lg">
                          <Plus className="h-4 w-4" />
                          Add Stock
                        </Button>
                      </Link>
                      {!item.is_sold_out && (
                        <Link href={`/branch/stock/out?product_id=${item.product_id}`}>
                          <Button variant="outline" className="w-full gap-2" size="lg">
                            <TrendingDown className="h-4 w-4" />
                            Remove Stock
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        size="lg"
                        onClick={() => setSelectedProduct(item)}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Sold Out Details */}
                  {item.is_sold_out && item.sold_out_details.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Sold Out Details (Last {item.sold_out_details.length} sales)
                      </h4>
                      <div className="space-y-2">
                        {item.sold_out_details.slice(0, 3).map((detail, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-semibold">Invoice:</span> {detail.invoice_number}
                                {detail.customer_name && (
                                  <> • <span className="font-semibold">Customer:</span> {detail.customer_name}</>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-red-600">
                                  -{detail.quantity_sold} {item.product.unit}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(detail.sold_date).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {item.sold_out_details.length > 3 && (
                          <Link href={`/branch/stock/ledger?product_id=${item.product_id}`}>
                            <Button variant="link" className="text-sm">
                              View all {item.sold_out_details.length} sales records →
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">{selectedProduct.product.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">SKU</p>
                  <p className="font-semibold">{selectedProduct.product.sku || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unit</p>
                  <p className="font-semibold">{selectedProduct.product.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining Stock</p>
                  <p className="text-xl font-bold">{selectedProduct.remaining_stock} {selectedProduct.product.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Selling Price</p>
                  <p className="text-xl font-bold">₹{selectedProduct.product.selling_price.toFixed(2)}</p>
                </div>
              </div>
              
              {selectedProduct.sold_out_details.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Sales History</h4>
                  <div className="space-y-2">
                    {selectedProduct.sold_out_details.map((detail, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold">Invoice: {detail.invoice_number}</p>
                            {detail.customer_name && (
                              <p className="text-sm text-gray-600">Customer: {detail.customer_name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-red-600">
                              -{detail.quantity_sold} {selectedProduct.product.unit}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(detail.sold_date).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Link href={`/branch/stock/in?product_id=${selectedProduct.product_id}`} className="flex-1">
                  <Button className="w-full" size="lg">Add Stock</Button>
                </Link>
                <Link href={`/branch/stock/ledger?product_id=${selectedProduct.product_id}`} className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">View Full History</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
