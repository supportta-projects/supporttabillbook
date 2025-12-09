import { useQuery } from '@tanstack/react-query'
import { Bill } from '@/types'

export interface Order extends Bill {
  branches?: {
    id: string
    name: string
    code: string
  }
  created_by_user?: {
    id: string
    full_name: string
    email: string
  }
}

export function useOrders(
  tenantId?: string, 
  branchId?: string, 
  filters?: {
    startDate?: string
    endDate?: string
    search?: string
    paymentFilter?: 'all' | 'paid' | 'due'
    paymentModeFilter?: 'all' | 'cash' | 'card' | 'upi' | 'credit'
    page?: number
    limit?: number
  }
) {
  return useQuery({
    // Use primitive values in query key to ensure stability
    queryKey: [
      'orders', 
      tenantId, 
      branchId, 
      filters?.startDate, 
      filters?.endDate,
      filters?.search,
      filters?.paymentFilter,
      filters?.paymentModeFilter,
      filters?.page,
      filters?.limit
    ],
    queryFn: async () => {
      const startTime = performance.now()
      let url = '/api/orders'
      const params = new URLSearchParams()
      if (tenantId) params.append('tenant_id', tenantId)
      if (branchId) params.append('branch_id', branchId)
      if (filters?.startDate) params.append('start_date', filters.startDate)
      if (filters?.endDate) params.append('end_date', filters.endDate)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.paymentFilter && filters.paymentFilter !== 'all') {
        params.append('payment_filter', filters.paymentFilter)
      }
      if (filters?.paymentModeFilter && filters.paymentModeFilter !== 'all') {
        params.append('payment_mode', filters.paymentModeFilter)
      }
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (params.toString()) url += `?${params.toString()}`
      
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'default', // Use browser cache
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
          throw new Error('Your session has expired. Please log in again.')
        }
        
        let errorMessage = 'Failed to fetch orders'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch {
          errorMessage = `${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Orders fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return {
        orders: (data.orders || []) as Order[],
        pagination: data.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 }
      }
    },
    enabled: !!tenantId || !!branchId,
    staleTime: 10 * 1000, // Cache for 10 seconds (reduced from 30s)
    gcTime: 1 * 60 * 1000, // Keep in cache for 1 minute (reduced from 2min)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('session has expired') || error?.message?.includes('Unauthorized')) {
        return false
      }
      return failureCount < 2
    },
    retryDelay: 100,
  })
}

export function useOrder(orderId: string, options?: {
  staleTime?: number
  refetchOnWindowFocus?: boolean
}) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const startTime = performance.now()
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
          throw new Error('Your session has expired. Please log in again.')
        }
        
        let errorMessage = 'Failed to fetch order'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch {
          errorMessage = `${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Order fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      
      return {
        order: data.order as Order,
        items: data.items || [],
      }
    },
    enabled: !!orderId,
    staleTime: options?.staleTime ?? 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })
}

