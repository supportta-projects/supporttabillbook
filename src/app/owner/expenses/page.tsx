'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useBranches } from '@/hooks/useBranches'
import PageContainer from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button-shadcn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input-shadcn'
import Link from 'next/link'
import { 
  DollarSign, 
  Plus, 
  Search, 
  Building2,
  Calendar,
  FileText,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'

export default function ExpensesPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('today')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  
  const { data: branches } = useBranches(tenantId)
  
  // Calculate date filters
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const filters = {
    startDate: dateFilter === 'today' ? todayStart.toISOString() : 
               dateFilter === 'month' ? monthStart.toISOString() : undefined,
    endDate: dateFilter === 'today' ? now.toISOString() : undefined,
  }
  
  const { data: expenses, isLoading, error, refetch } = useQuery({
    queryKey: ['expenses', tenantId, selectedBranchId === 'all' ? undefined : selectedBranchId, filters, categoryFilter],
    queryFn: async () => {
      let url = '/api/expenses'
      const params = new URLSearchParams()
      if (tenantId) params.append('tenant_id', tenantId)
      if (selectedBranchId !== 'all') params.append('branch_id', selectedBranchId)
      if (filters.startDate) params.append('start_date', filters.startDate)
      if (filters.endDate) params.append('end_date', filters.endDate)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (params.toString()) url += `?${params.toString()}`
      
      const response = await fetch(url, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
          throw new Error('Your session has expired. Please log in again.')
        }
        
        let errorMessage = 'Failed to fetch expenses'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch {
          errorMessage = `${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return (data.expenses || []) as any[]
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('session has expired') || error?.message?.includes('Unauthorized')) {
        return false
      }
      return failureCount < 2
    },
  })

  if (!tenantId) {
    return (
      <PageContainer title="Expenses">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const filteredExpenses = expenses?.filter(expense => {
    const matchesSearch = 
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.amount?.toString().includes(searchQuery)
    return matchesSearch
  }) || []

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const totalExpensesCount = filteredExpenses.length
  
  // Get unique categories
  const categories = Array.from(new Set(expenses?.map(e => e.category).filter(Boolean) || []))

  return (
    <PageContainer
      title="Expenses"
      description="View and manage expenses across all branches"
      actions={
        <Link href="/owner/expenses/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Expense
          </Button>
        </Link>
      }
    >
      {/* Filters and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{totalExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-500 mt-1">{totalExpensesCount} entries</p>
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
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Category Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
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
              placeholder="Search expenses by description, category, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading expenses...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <p className="font-semibold mb-2">Error loading expenses</p>
              <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
            </div>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No expenses found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search'
                : 'No expenses have been recorded yet'}
            </p>
            <Link href="/owner/expenses/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Expense
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <DollarSign className="h-5 w-5 text-red-600" />
                      <div>
                        <h3 className="text-lg font-semibold">{expense.description || 'No description'}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(expense.expense_date || expense.created_at).toLocaleDateString('en-IN', {
                            dateStyle: 'medium'
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
                            {(expense as any).branches?.name || 'N/A'}
                          </span>
                        </span>
                      </div>
                      
                      {expense.category && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            <span className="text-gray-500">Category: </span>
                            <span className="font-semibold">{expense.category}</span>
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-red-600" />
                        <span className="text-sm">
                          <span className="text-gray-500">Amount: </span>
                          <span className="font-semibold text-red-600">
                            ₹{Number(expense.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </span>
                      </div>
                    </div>
                    
                    {(expense as any).created_by_user && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Recorded by {(expense as any).created_by_user.full_name}
                        </span>
                      </div>
                    )}
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

