'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
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
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function OrdersPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('today')
  
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
    }
  }, [dateFilter]) // Only recalculate when dateFilter changes
  
  const { data: orders, isLoading, error, refetch } = useOrders(
    tenantId,
    selectedBranchId === 'all' ? undefined : selectedBranchId,
    filters
  )

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

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.includes(searchQuery)
    return matchesSearch
  }) || []

  const totalSales = filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
  const totalOrders = filteredOrders.length

  return (
    <PageContainer
      title="Order Management"
      description="View and manage all sales orders and invoices across your branches"
    >
      {/* Filters and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalSales.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500 mt-1">{totalOrders} orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-gray-500 mt-1">This {dateFilter}</p>
          </CardContent>
        </Card>
        
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
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* Search */}
      <Card className="mb-6">
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

      {/* Orders List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
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
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search'
                : 'No orders have been created yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold">{order.invoice_number}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          <span className="text-gray-500">Branch: </span>
                          <span className="font-semibold">
                            {(order as any).branches?.name || 'N/A'}
                          </span>
                        </span>
                      </div>
                      
                      {order.customer_name && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            <span className="text-gray-500">Customer: </span>
                            <span className="font-semibold">{order.customer_name}</span>
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          <span className="text-gray-500">Amount: </span>
                          <span className="font-semibold text-green-600">
                            ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
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
                      {(order as any).created_by_user && (
                        <span className="text-xs text-gray-500">
                          by {(order as any).created_by_user.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Link href={`/owner/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/owner/orders/${order.id}/invoice`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Invoice
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  )
}

