'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useStockLedger } from '@/hooks/useStock'
import { useProducts } from '@/hooks/useProducts'
import { StockLedger, Product } from '@/types'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Input } from '@/components/ui/input-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  History, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Package,
  ShoppingCart,
  ArrowRightLeft,
  FileText
} from 'lucide-react'
import Link from 'next/link'
// Helper function to format dates
const formatDate = (dateString: string, formatType: 'date' | 'time' | 'datetime' = 'date') => {
  const date = new Date(dateString)
  if (formatType === 'time') {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
  if (formatType === 'datetime') {
    return date.toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }
  return date.toLocaleDateString('en-IN', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

const TRANSACTION_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  stock_in: { label: 'Stock In', icon: TrendingUp, color: 'text-green-600 bg-green-100' },
  stock_out: { label: 'Stock Out', icon: TrendingDown, color: 'text-red-600 bg-red-100' },
  adjustment: { label: 'Adjustment', icon: ArrowRightLeft, color: 'text-yellow-600 bg-yellow-100' },
  transfer_in: { label: 'Transfer In', icon: TrendingUp, color: 'text-blue-600 bg-blue-100' },
  transfer_out: { label: 'Transfer Out', icon: TrendingDown, color: 'text-purple-600 bg-purple-100' },
  billing: { label: 'Sold', icon: ShoppingCart, color: 'text-orange-600 bg-orange-100' },
  purchase: { label: 'Purchase', icon: Package, color: 'text-indigo-600 bg-indigo-100' },
}

function StockLedgerPageContent() {
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const branchId = user?.branch_id
  const productIdParam = searchParams.get('product_id')

  const [selectedProductId, setSelectedProductId] = useState<string>(productIdParam || 'all')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: ledger, isLoading, error } = useStockLedger(branchId || '', selectedProductId === 'all' ? undefined : selectedProductId)
  
  // Type assertion: ledger entries include product and bill data from API
  type LedgerEntryWithRelations = StockLedger & {
    product?: Product
    bill?: { invoice_number: string; created_at: string; customer_name?: string }
    created_by_user?: { full_name?: string; email: string }
  }
  
  const ledgerEntries = (ledger || []) as LedgerEntryWithRelations[]
  const { data: products } = useProducts()

  if (!branchId) {
    return (
      <PageContainer title="Stock Ledger">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No branch assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  // Filter ledger entries
  let filteredLedger = ledgerEntries
  
  if (transactionTypeFilter !== 'all') {
    filteredLedger = filteredLedger.filter(entry => entry.transaction_type === transactionTypeFilter)
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredLedger = filteredLedger.filter(entry => {
      const productName = (entry.product as any)?.name?.toLowerCase() || ''
      const reason = entry.reason?.toLowerCase() || ''
      const invoiceNumber = (entry as any).bill?.invoice_number?.toLowerCase() || ''
      return productName.includes(query) || reason.includes(query) || invoiceNumber.includes(query)
    })
  }

  // Group by date
  const groupedByDate = filteredLedger.reduce((acc, entry) => {
    const date = new Date(entry.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(entry)
    return acc
  }, {} as Record<string, typeof filteredLedger>)

  const getTransactionInfo = (entry: any) => {
    const type = TRANSACTION_TYPES[entry.transaction_type] || TRANSACTION_TYPES.stock_in
    const Icon = type.icon
    
    return { ...type, Icon }
  }

  return (
    <PageContainer
      title="Stock Ledger"
      description="Complete history of all stock movements and transactions"
    >
      <div className="space-y-6">
        <Link href="/branch/stock">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Stock List
          </Button>
        </Link>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by product, reason, or invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Filter by product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.filter(p => p.is_active).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Entries */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">Loading ledger data...</div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-red-600">Error loading ledger: {error.message}</div>
            </CardContent>
          </Card>
        ) : filteredLedger.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <History className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedProductId !== 'all' || transactionTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No stock movements recorded yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, entries]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {formatDate(date, 'date')}
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({entries.length} {entries.length === 1 ? 'transaction' : 'transactions'})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {entries.map((entry) => {
                        const transactionInfo = getTransactionInfo(entry)
                        const product = entry.product || null
                        const isSold = entry.transaction_type === 'billing'
                        const bill = entry.bill || null

                        return (
                          <div
                            key={entry.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              {/* Left: Product & Transaction Info */}
                              <div className="flex-1">
                                <div className="flex items-start gap-4">
                                  <div className={`p-2 rounded-lg ${transactionInfo.color}`}>
                                    <transactionInfo.Icon className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="text-lg font-semibold">
                                        {product?.name || 'Unknown Product'}
                                      </h4>
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${transactionInfo.color}`}>
                                        {transactionInfo.label}
                                      </span>
                                    </div>
                                    
                                    {isSold && bill && (
                                      <div className="mb-2 p-2 bg-orange-50 rounded border border-orange-200">
                                        <div className="flex items-center gap-2 text-sm">
                                          <ShoppingCart className="h-4 w-4 text-orange-600" />
                                          <span className="font-semibold">Invoice:</span>
                                          <span className="font-mono">{bill.invoice_number}</span>
                                          {bill.customer_name && (
                                            <>
                                              <span className="text-gray-400">•</span>
                                              <span>Customer: {bill.customer_name}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                      <div>
                                        <p className="text-xs text-gray-600">Quantity</p>
                                        <p className={`text-lg font-bold ${entry.transaction_type === 'stock_out' || entry.transaction_type === 'billing' ? 'text-red-600' : 'text-green-600'}`}>
                                          {entry.transaction_type === 'stock_out' || entry.transaction_type === 'billing' ? '-' : '+'}
                                          {entry.quantity} {product?.unit || ''}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Previous Stock</p>
                                        <p className="text-lg font-semibold">{entry.previous_stock} {product?.unit || ''}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Current Stock</p>
                                        <p className="text-lg font-semibold">{entry.current_stock} {product?.unit || ''}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Time</p>
                                        <p className="text-sm font-semibold">
                                          {formatDate(entry.created_at, 'time')}
                                        </p>
                                      </div>
                                    </div>

                                    {entry.reason && (
                                      <div className="mt-3 p-2 bg-gray-50 rounded">
                                        <p className="text-xs text-gray-600 mb-1">Reason:</p>
                                        <p className="text-sm">{entry.reason}</p>
                                      </div>
                                    )}

                                    {entry.created_by_user && (
                                      <p className="text-xs text-gray-500 mt-2">
                                        By: {entry.created_by_user.full_name || entry.created_by_user.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}

export default function StockLedgerPage() {
  return (
    <Suspense fallback={
      <PageContainer title="Stock Ledger">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading...</div>
          </CardContent>
        </Card>
      </PageContainer>
    }>
      <StockLedgerPageContent />
    </Suspense>
  )
}
