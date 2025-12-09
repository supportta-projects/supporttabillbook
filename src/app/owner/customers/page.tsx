'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers'
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
  UserCircle, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import DeleteConfirmDialog from '@/components/modals/DeleteConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { Customer } from '@/types'

export default function CustomersPage() {
  const { user, isLoading: authLoading } = useAuthStore()
  const tenantId = user?.tenant_id
  
  // Fetch user if not loaded
  const { isLoading: userLoading } = useCurrentUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  
  const { data: customers, isLoading, error, refetch } = useCustomers({
    search: searchQuery || undefined,
    is_active: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
  })
  
  const deleteCustomer = useDeleteCustomer()

  // Wait for auth to load before checking tenantId
  if (authLoading || userLoading) {
    return (
      <PageContainer title="Customers">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading...</div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!tenantId) {
    return (
      <PageContainer title="Customers">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">No tenant assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const handleDelete = async () => {
    if (!customerToDelete) return
    
    try {
      await deleteCustomer.mutateAsync(customerToDelete.id)
      toast.success('Customer deleted successfully')
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete customer')
    }
  }

  const totalCustomers = customers?.length || 0
  const activeCustomers = customers?.filter(c => c.is_active).length || 0
  const inactiveCustomers = customers?.filter(c => !c.is_active).length || 0

  const hasActiveFilters = statusFilter !== 'all' || searchQuery !== ''

  const clearFilters = () => {
    setStatusFilter('all')
    setSearchQuery('')
  }

  // Pagination calculations
  const totalPages = Math.ceil(totalCustomers / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCustomers = customers?.slice(startIndex, endIndex) || []

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  return (
    <PageContainer
      title="Customers"
      description="Manage your customer database"
      actions={
        <Link href="/owner/customers/create">
          <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5" />
            Add Customer
          </Button>
        </Link>
      }
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Customers</div>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Active</div>
            <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Inactive</div>
            <div className="text-2xl font-bold text-gray-600">{inactiveCustomers}</div>
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
                  placeholder="Search customers by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-10 gap-2"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading customers...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <p className="font-semibold mb-2">Error loading customers</p>
              <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
            </div>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : !customers || customers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first customer'}
            </p>
            <Link href="/owner/customers/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Customer
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
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Phone Number</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Name */}
                    <TableCell>
                      <div className="font-semibold text-gray-900">
                        {customer.name}
                      </div>
                    </TableCell>

                    {/* Phone Number */}
                    <TableCell>
                      {customer.phone ? (
                        <span className="text-sm text-gray-700">{customer.phone}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {customer.is_active ? (
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
                            <Link href={`/owner/customers/${customer.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="h-4 w-4" />
                              Edit Customer
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCustomerToDelete(customer)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-600 cursor-pointer focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Customer
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
                <span className="font-semibold">{Math.min(endIndex, totalCustomers)}</span> of{' '}
                <span className="font-semibold">{totalCustomers}</span> customers
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
        title="Delete Customer"
        description={`Are you sure you want to delete "${customerToDelete?.name}"? This action cannot be undone.`}
        isLoading={deleteCustomer.isPending}
      />
    </PageContainer>
  )
}

