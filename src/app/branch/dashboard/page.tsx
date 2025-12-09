'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useCurrentStock } from '@/hooks/useStock'
import PageContainer from '@/components/layout/PageContainer'
import StatCard from '@/components/cards/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, 
  ArrowUp, ArrowDown, MinusCircle 
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button-shadcn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BranchDashboard() {
  const { user } = useAuthStore()
  const branchId = user?.branch_id
  const [period, setPeriod] = useState<'today' | 'month' | 'all'>('today')
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats(branchId, undefined, period)
  const { data: stockData } = useCurrentStock(branchId || '')

  if (!branchId) {
    return (
      <PageContainer title="Branch Dashboard">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No branch assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const stockItems = (stockData as any[]) || []
  const lowStockItems = stats?.stock.low_stock || 0
  const soldOutItems = stats?.stock.sold_out || 0

  return (
    <PageContainer
      title="Branch Dashboard"
      description="Overview of your branch operations, sales, and stock"
    >
      {/* Period Selector */}
      <div className="mb-6 flex justify-end">
        <Select value={period} onValueChange={(val: 'today' | 'month' | 'all') => setPeriod(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* PRIMARY METRICS - Sales & Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Sales */}
        <StatCard
          title={`Total Sales (${period})`}
          value={`₹${stats?.sales.total.toLocaleString('en-IN') || '0'}`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          description={`${stats?.sales.count || 0} bills`}
          className="border-green-200 bg-green-50"
        />
        
        {/* Total Stock Value */}
        <StatCard
          title="Stock Value"
          value={`₹${stats?.stock.total_value.toLocaleString('en-IN') || '0'}`}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          description={`${stats?.stock.products_with_stock || 0} products`}
          className="border-blue-200 bg-blue-50"
        />
        
        {/* Profit */}
        <StatCard
          title={`Profit (${period})`}
          value={`₹${stats?.profit.total.toLocaleString('en-IN') || '0'}`}
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          description={`${stats?.profit.margin.toFixed(1) || '0'}% margin`}
          className={stats?.profit.total && stats.profit.total >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
        />
        
        {/* Total Products */}
        <StatCard
          title="Total Products"
          value={stats?.stock.total_products || 0}
          icon={<Package className="h-6 w-6" />}
          description={`${stats?.stock.in_stock || 0} in stock`}
        />
      </div>

      {/* SECONDARY METRICS - Stock Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Low Stock"
          value={lowStockItems}
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
          description="Need restocking"
          className={lowStockItems > 0 ? 'border-yellow-300 bg-yellow-50' : ''}
        />
        <StatCard
          title="Sold Out"
          value={soldOutItems}
          icon={<MinusCircle className="h-6 w-6 text-red-600" />}
          description="Out of stock"
          className={soldOutItems > 0 ? 'border-red-300 bg-red-50' : ''}
        />
        <StatCard
          title={`Expenses (${period})`}
          value={`₹${stats?.expenses.total.toLocaleString('en-IN') || '0'}`}
          icon={<ArrowDown className="h-6 w-6 text-orange-600" />}
          description={`${stats?.expenses.count || 0} entries`}
        />
        <StatCard
          title={`Purchases (${period})`}
          value={`₹${stats?.purchases.total.toLocaleString('en-IN') || '0'}`}
          icon={<ArrowUp className="h-6 w-6 text-indigo-600" />}
          description={`${stats?.purchases.count || 0} orders`}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Sales & Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-2xl font-bold text-green-600">₹{stats?.sales.total.toLocaleString('en-IN') || '0'}</p>
              <p className="text-sm text-gray-600">{stats?.sales.count || 0} bills this {period}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/branch/billing" className="flex-1">
                <Button className="w-full">New Bill</Button>
              </Link>
              <Link href="/branch/bills" className="flex-1">
                <Button variant="outline" className="w-full">View Bills</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Stock Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-2xl font-bold text-blue-600">₹{stats?.stock.total_value.toLocaleString('en-IN') || '0'}</p>
              <p className="text-sm text-gray-600">Total stock value</p>
            </div>
            <div className="flex gap-2">
              <Link href="/branch/stock" className="flex-1">
                <Button className="w-full">View Stock</Button>
              </Link>
              <Link href="/branch/stock/in" className="flex-1">
                <Button variant="outline" className="w-full">Add Stock</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Profit & Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className={`text-2xl font-bold ${stats?.profit.total && stats.profit.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{stats?.profit.total.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-sm text-gray-600">
                {stats?.profit.margin.toFixed(1) || '0'}% profit margin
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/branch/expenses/create" className="flex-1">
                <Button className="w-full">Add Expense</Button>
              </Link>
              <Link href="/branch/purchases/create" className="flex-1">
                <Button variant="outline" className="w-full">Add Purchase</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800 mb-4">
              You have <strong>{lowStockItems}</strong> product(s) with low stock levels. 
              Consider restocking soon.
            </p>
            <Link href="/branch/stock">
              <Button variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                View Stock
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
