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

export function useOrders(tenantId?: string, branchId?: string, filters?: {
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    // Use primitive values in query key to ensure stability
    queryKey: ['orders', tenantId, branchId, filters?.startDate, filters?.endDate],
    queryFn: async () => {
      const startTime = performance.now()
      let url = '/api/orders'
      const params = new URLSearchParams()
      if (tenantId) params.append('tenant_id', tenantId)
      if (branchId) params.append('branch_id', branchId)
      if (filters?.startDate) params.append('start_date', filters.startDate)
      if (filters?.endDate) params.append('end_date', filters.endDate)
      if (params.toString()) url += `?${params.toString()}`
      
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store', // Always fetch fresh data
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
      return (data.orders || []) as Order[]
    },
    enabled: !!tenantId || !!branchId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on mount if data exists
    refetchOnReconnect: false, // Prevent refetch on reconnect
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('session has expired') || error?.message?.includes('Unauthorized')) {
        return false
      }
      return failureCount < 2
    },
    retryDelay: 100, // Faster retry
  })
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
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
      return {
        order: data.order as Order,
        items: data.items || [],
      }
    },
    enabled: !!orderId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  })
}

