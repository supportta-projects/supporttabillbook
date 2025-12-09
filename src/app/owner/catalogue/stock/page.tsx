'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useBranches } from '@/hooks/useBranches'
import { useCurrentStock } from '@/hooks/useStock'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import { 
  Package, 
  Search, 
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function StockPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: branches } = useBranches(tenantId)
  const { data: stockData, isLoading } = useCurrentStock(
    selectedBranchId === 'all' ? undefined : selectedBranchId,
    selectedBranchId === 'all' ? tenantId : undefined
  )

  if (!tenantId) {
    return (
      <PageContainer title="Stock Overview">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const stockItems = (stockData as any[]) || []
  
  // Get all products for tenant to calculate totals
  const allStockItems = stockItems || []
  
  // Filter by search
  const filteredStock = allStockItems.filter((item: any) => {
    const matchesSearch = 
      item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product_code?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Calculate statistics
  const totalProducts = filteredStock.length
  const inStock = filteredStock.filter((item: any) => item.quantity > 0).length
  const lowStock = filteredStock.filter((item: any) => {
    return item.min_stock > 0 && item.quantity <= item.min_stock && item.quantity > 0
  }).length
  const soldOut = filteredStock.filter((item: any) => item.quantity === 0).length

  return (
    <PageContainer
      title="Stock Overview"
      description="View stock levels across all branches or filter by specific branch"
    >
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Branch Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches?.filter(b => b.is_active).map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <div className="text-3xl font-bold text-green-600">{inStock}</div>
          </CardContent>
        </Card>
        
        <Card className={lowStock > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{lowStock}</div>
          </CardContent>
        </Card>
        
        <Card className={soldOut > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Sold Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{soldOut}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stock List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading stock information...</div>
          </CardContent>
        </Card>
      ) : filteredStock.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No stock found</h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Try adjusting your search'
                : 'No stock items available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStock.map((item: any, index: number) => {
            const isLowStock = item.min_stock > 0 && item.quantity <= item.min_stock && item.quantity > 0
            const isSoldOut = item.quantity === 0
            
            return (
              <Card 
                key={item.id || index} 
                className={`hover:shadow-lg transition-shadow ${
                  isSoldOut ? 'border-red-200 bg-red-50' : 
                  isLowStock ? 'border-yellow-200 bg-yellow-50' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Package className={`h-5 w-5 ${
                          isSoldOut ? 'text-red-600' : 
                          isLowStock ? 'text-yellow-600' : 
                          'text-green-600'
                        }`} />
                        <div>
                          <h3 className="text-lg font-semibold">{item.product_name}</h3>
                          {item.product_code && (
                            <p className="text-sm text-gray-500">Code: {item.product_code}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Branch</p>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{item.branch_name || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Current Stock</p>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className={`text-lg font-bold ${
                              isSoldOut ? 'text-red-600' : 
                              isLowStock ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>
                              {item.quantity}
                            </span>
                            {item.min_stock > 0 && (
                              <span className="text-xs text-gray-500">
                                (Min: {item.min_stock})
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Stock Value</p>
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">
                              ₹{((item.quantity || 0) * (item.purchase_price || item.selling_price || 0)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {isSoldOut ? (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          Sold Out
                        </span>
                      ) : isLowStock ? (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}

