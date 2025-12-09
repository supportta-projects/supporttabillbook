'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useBranches } from '@/hooks/useBranches'
import { useUsers } from '@/hooks/useUsers'
import PageContainer from '@/components/layout/PageContainer'
import StatCard from '@/components/cards/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, 
  ArrowUp, ArrowDown, MinusCircle, Building2, Users 
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

export default function OwnerDashboard() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const [period, setPeriod] = useState<'today' | 'month' | 'all'>('today')
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats(undefined, tenantId, period)
  const { data: branches } = useBranches(tenantId)
  const { data: users } = useUsers(tenantId)
  
  // Filter users for this tenant
  const tenantUsers = users?.filter(u => u.tenant_id === tenantId && u.role !== 'tenant_owner') || []

  if (!tenantId) {
    return (
      <PageContainer title="Dashboard">
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
      title="Owner Dashboard"
      description="Overview of your shop's sales, stock, and operations"
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
          description={`${stats?.sales.count || 0} bills across all branches`}
          className="border-green-200 bg-green-50"
        />
        
        {/* Total Stock Value */}
        <StatCard
          title="Total Stock Value"
          value={`₹${stats?.stock.total_value.toLocaleString('en-IN') || '0'}`}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          description={`${stats?.stock.products_with_stock || 0} products in stock`}
          className="border-blue-200 bg-blue-50"
        />
        
        {/* Profit */}
        <StatCard
          title={`Profit (${period})`}
          value={`₹${stats?.profit.total.toLocaleString('en-IN') || '0'}`}
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          description={`${stats?.profit.margin.toFixed(1) || '0'}% profit margin`}
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

      {/* SECONDARY METRICS - Stock Status & Financials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Low Stock Items"
          value={stats?.stock.low_stock || 0}
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
          description="Need restocking"
          className={(stats?.stock.low_stock || 0) > 0 ? 'border-yellow-300 bg-yellow-50' : ''}
        />
        <StatCard
          title="Sold Out Items"
          value={stats?.stock.sold_out || 0}
          icon={<MinusCircle className="h-6 w-6 text-red-600" />}
          description="Out of stock"
          className={(stats?.stock.sold_out || 0) > 0 ? 'border-red-300 bg-red-50' : ''}
        />
        <StatCard
          title={`Total Expenses (${period})`}
          value={`₹${stats?.expenses.total.toLocaleString('en-IN') || '0'}`}
          icon={<ArrowDown className="h-6 w-6 text-orange-600" />}
          description={`${stats?.expenses.count || 0} entries`}
        />
        <StatCard
          title={`Total Purchases (${period})`}
          value={`₹${stats?.purchases.total.toLocaleString('en-IN') || '0'}`}
          icon={<ArrowUp className="h-6 w-6 text-indigo-600" />}
          description={`${stats?.purchases.count || 0} orders`}
        />
      </div>

      {/* Quick Actions - Primary Focus */}
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
              <Link href="/owner/products" className="flex-1">
                <Button className="w-full">View Products</Button>
              </Link>
              <Link href="/owner/products/create" className="flex-1">
                <Button variant="outline" className="w-full">Add Product</Button>
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
              <p className="text-sm text-gray-600">Total stock value across all branches</p>
            </div>
            <div className="flex gap-2">
              <Link href="/owner/products" className="flex-1">
                <Button className="w-full">View Catalogue</Button>
              </Link>
              <Link href="/owner/products/create" className="flex-1">
                <Button variant="outline" className="w-full">Add Product</Button>
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
              <Link href="/owner/branches" className="flex-1">
                <Button className="w-full">View Branches</Button>
              </Link>
              <Link href="/owner/branches/create" className="flex-1">
                <Button variant="outline" className="w-full">Add Branch</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {(stats?.stock.low_stock || 0) > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800 mb-4">
              You have <strong>{stats?.stock.low_stock || 0}</strong> product(s) with low stock levels across all branches. 
              Consider restocking soon.
            </p>
            <Link href="/owner/products">
              <Button variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                View Catalogue
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Secondary Info - Branches & Staff (Less Prominent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                Branches ({branches?.length || 0})
              </CardTitle>
              <Link href="/owner/branches">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {branches?.slice(0, 3).map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <span className="font-medium">{branch.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    branch.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {(!branches || branches.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-2">No branches yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Staff ({tenantUsers.length})
              </CardTitle>
              <Link href="/owner/users">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenantUsers.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <span className="font-medium">{member.full_name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    member.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {tenantUsers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No staff members yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
