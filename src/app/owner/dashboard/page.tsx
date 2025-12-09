'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { useBranchStore } from '@/store/branchStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useBranches } from '@/hooks/useBranches'
import { useUsers } from '@/hooks/useUsers'
import PageContainer from '@/components/layout/PageContainer'
import StatCard from '@/components/cards/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, 
  ArrowUp, ArrowDown, MinusCircle, Building2, Users, Loader2
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
  const { user, isLoading: authLoading } = useAuthStore()
  const { selectedBranchId } = useBranchStore()
  const tenantId = user?.tenant_id
  const [period, setPeriod] = useState<'today' | 'month' | 'all'>('today')
  
  // Fetch user if not loaded
  const { isLoading: userLoading } = useCurrentUser()
  
  const { data: branches } = useBranches(tenantId)
  
  // Set default branch to main branch if not set
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      const mainBranch = branches.find(b => b.is_main && b.is_active)
      if (mainBranch) {
        useBranchStore.getState().setSelectedBranch(mainBranch.id)
      }
    }
  }, [branches, selectedBranchId])
  
  // Fetch stats for selected branch
  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useDashboardStats(
    selectedBranchId || undefined, 
    tenantId, 
    period
  )
  const { data: users } = useUsers(tenantId)
  
  const currentBranch = branches?.find(b => b.id === selectedBranchId)
  const isLoading = statsLoading || statsFetching
  
  // Filter users for this tenant
  const tenantUsers = users?.filter(u => u.tenant_id === tenantId && u.role !== 'tenant_owner') || []

  // Wait for auth to load before checking tenantId
  if (authLoading || userLoading) {
    return (
      <PageContainer title="Dashboard">
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
      description={currentBranch ? `Overview for ${currentBranch.name}` : "Overview of your shop's sales, stock, and operations"}
    >
      {/* Branch Info Banner */}
      {currentBranch && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-semibold text-blue-900">Viewing: {currentBranch.name}</div>
              <div className="text-sm text-blue-700">All data shown for this branch only</div>
            </div>
          </div>
          {currentBranch.is_main && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">Main Branch</span>
          )}
          {isLoading && (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !stats && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading dashboard data...</span>
        </div>
      )}

      {/* Period Selector */}
      <div className="mb-6 flex justify-end">
        <Select 
          value={period} 
          onValueChange={(val: 'today' | 'month' | 'all') => setPeriod(val)}
          disabled={isLoading}
        >
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
      {!isLoading && stats && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Sales */}
        <StatCard
          title={`Total Sales (${period})`}
          value={`₹${stats.sales.total.toLocaleString('en-IN')}`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          description={`${stats.sales.count} bills`}
          className="border-green-200 bg-green-50"
        />
        
        {/* Total Stock Value */}
        <StatCard
          title="Total Stock Value"
          value={`₹${stats.stock.total_value.toLocaleString('en-IN')}`}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          description={`${stats.stock.products_with_stock} products in stock`}
          className="border-blue-200 bg-blue-50"
        />
        
        {/* Profit */}
        <StatCard
          title={`Profit (${period})`}
          value={`₹${stats.profit.total.toLocaleString('en-IN')}`}
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          description={`${stats.profit.margin.toFixed(1)}% profit margin`}
          className={stats.profit.total >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
        />
        
        {/* Active Products */}
        <StatCard
          title="Active Products"
          value={stats.stock.total_products}
          icon={<Package className="h-6 w-6 text-indigo-600" />}
          description={`${stats.stock.in_stock} in stock`}
          className="border-indigo-200 bg-indigo-50"
        />
      </div>

      {/* SECONDARY METRICS - Stock Status & Financials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Low Stock Items"
          value={stats.stock.low_stock}
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
          description="Need restocking"
          className={stats.stock.low_stock > 0 ? 'border-yellow-300 bg-yellow-50' : ''}
        />
        <StatCard
          title="Sold Out Items"
          value={stats.stock.sold_out}
          icon={<MinusCircle className="h-6 w-6 text-red-600" />}
          description="Out of stock"
          className={stats.stock.sold_out > 0 ? 'border-red-300 bg-red-50' : ''}
        />
        <StatCard
          title={`Total Expenses (${period})`}
          value={`₹${stats.expenses.total.toLocaleString('en-IN')}`}
          icon={<ArrowDown className="h-6 w-6 text-orange-600" />}
          description={`${stats.expenses.count} entries`}
        />
        <StatCard
          title={`Total Purchases (${period})`}
          value={`₹${stats.purchases.total.toLocaleString('en-IN')}`}
          icon={<ArrowUp className="h-6 w-6 text-indigo-600" />}
          description={`${stats.purchases.count} orders`}
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
              <p className="text-2xl font-bold text-green-600">₹{stats.sales.total.toLocaleString('en-IN')}</p>
              <p className="text-sm text-gray-600">{stats.sales.count} bills this {period}</p>
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
              <p className="text-2xl font-bold text-blue-600">₹{stats.stock.total_value.toLocaleString('en-IN')}</p>
              <p className="text-sm text-gray-600">Total stock value</p>
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
              <p className={`text-2xl font-bold ${stats.profit.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{stats.profit.total.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-600">
                {stats.profit.margin.toFixed(1)}% profit margin
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
      {stats.stock.low_stock > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800 mb-4">
              You have <strong>{stats.stock.low_stock}</strong> product(s) with low stock levels. 
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
        </>
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
