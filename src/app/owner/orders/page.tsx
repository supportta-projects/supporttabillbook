'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { useOrders } from '@/hooks/useOrders'
import { useBranches } from '@/hooks/useBranches'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import Link from 'next/link'
import { 
  Receipt, 
  Plus, 
  Search, 
  Eye,
  Download,
  Building2,
  DollarSign,
  FileText,
  TrendingUp,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ITEMS_PER_PAGE = 25

export default function OrdersPage() {
  const { user } = useAuthStore()
  const { selectedBranchId } = useBranchStore()
  const tenantId = user?.tenant_id
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('today')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'due'>('all')
  const [paymentModeFilter, setPaymentModeFilter] = useState<'all' | 'cash' | 'card' | 'upi' | 'credit'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to page 1 on search
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Fetch branches for branch selector
  const { data: branches } = useBranches(tenantId)
  
  // Memoize date filters to prevent continuous refetching
  const filters = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    return {
      startDate: dateFilter === 'today' ? todayStart.toISOString() : 
                 dateFilter === 'month' ? monthStart.toISOString() : undefined,
      endDate: dateFilter === 'today' ? now.toISOString() : undefined,
      search: debouncedSearch || undefined,
      paymentFilter,
      paymentModeFilter,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    }
  }, [dateFilter, debouncedSearch, paymentFilter, paymentModeFilter, currentPage])
  
  // Fetch orders with server-side filtering and pagination
  const { data: ordersData, isLoading, error, refetch } = useOrders(
    tenantId,
    selectedBranchId || undefined,
    filters
  )

  const orders = ordersData?.orders || []
  const pagination = ordersData?.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 }

  // Calculate stats from current page data (or fetch separately for accurate totals)
  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    const totalProfit = orders.reduce((sum, order) => sum + Number((order as any).profit_amount || 0), 0)
    const totalDue = orders.reduce((sum, order) => sum + Number((order as any).due_amount || 0), 0)
    const dueOrdersCount = orders.filter(order => {
      const dueAmount = (order as any).due_amount || 0
      return dueAmount > 0
    }).length
    
    return {
      totalSales,
      totalProfit,
      totalDue,
      dueOrdersCount,
      totalOrders: pagination.total || orders.length,
    }
  }, [orders, pagination.total])

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearch, paymentFilter, paymentModeFilter, dateFilter, selectedBranchId])

  if (!tenantId) {
    return (
      <PageContainer title="Order Management">
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
      title="Order"
      description="View and manage all sales orders and invoices"
      actions={
        <Link href="/owner/orders/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Order
          </Button>
        </Link>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{stats.totalSales.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.totalOrders} orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₹{stats.totalProfit.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalSales > 0 ? `${((stats.totalProfit / stats.totalSales) * 100).toFixed(1)}% margin` : 'No sales'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{stats.totalDue.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.dueOrdersCount} orders with due</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Date Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={dateFilter} onValueChange={(val: 'today' | 'month' | 'all') => setDateFilter(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by invoice number, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <Select value={paymentFilter} onValueChange={(val: 'all' | 'paid' | 'due') => setPaymentFilter(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="paid">Fully Paid</SelectItem>
                <SelectItem value="due">Has Due</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <Select value={paymentModeFilter} onValueChange={(val: 'all' | 'cash' | 'card' | 'upi' | 'credit') => setPaymentModeFilter(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-gray-500">Loading orders...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <p className="font-semibold mb-2">Error loading orders</p>
              <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
            </div>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {debouncedSearch || paymentFilter !== 'all' || paymentModeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No orders have been created yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Due Amount
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => {
                      const orderWithExtras = order as any
                      const dueAmount = orderWithExtras.due_amount || 0
                      const isFullyPaid = dueAmount <= 0
                      
                      return (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-gray-900">{order.invoice_number}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(order.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {orderWithExtras.branches?.name || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {order.customer_name || (
                                <span className="text-gray-400 italic">Walk-in Customer</span>
                              )}
                            </div>
                            {order.customer_phone && (
                              <div className="text-xs text-gray-500">{order.customer_phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              order.payment_mode === 'cash' 
                                ? 'bg-green-100 text-green-800'
                                : order.payment_mode === 'card'
                                ? 'bg-blue-100 text-blue-800'
                                : order.payment_mode === 'upi'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {order.payment_mode?.toUpperCase() || 'CASH'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-green-600">
                              ₹{Number(order.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isFullyPaid ? (
                              <span className="text-sm font-semibold text-green-600">Paid</span>
                            ) : (
                              <span className="text-sm font-semibold text-red-600">
                                ₹{Number(dueAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {orderWithExtras.profit_amount !== undefined && orderWithExtras.profit_amount > 0 ? (
                              <span className="text-sm font-semibold text-purple-600">
                                ₹{Number(orderWithExtras.profit_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link href={`/owner/orders/${order.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Order Details">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  toast.loading('Generating PDF...', { id: 'pdf-download' })
                                  try {
                                    const response = await fetch(`/api/orders/${order.id}/invoice/pdf`, {
                                      method: 'GET',
                                    })
                                    
                                    if (!response.ok) {
                                      throw new Error('Failed to generate PDF')
                                    }
                                    
                                    const blob = await response.blob()
                                    const url = window.URL.createObjectURL(blob)
                                    const link = document.createElement('a')
                                    link.href = url
                                    link.download = `Invoice-${order.invoice_number}.pdf`
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    window.URL.revokeObjectURL(url)
                                    toast.success('Invoice downloaded successfully', { id: 'pdf-download' })
                                  } catch (error: any) {
                                    toast.error(error.message || 'Failed to download invoice', { id: 'pdf-download' })
                                  }
                                }}
                                title="Download PDF Invoice"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={pagination.page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  )
}
