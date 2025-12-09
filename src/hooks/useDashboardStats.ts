import { useQuery } from '@tanstack/react-query'

export interface DashboardStats {
  sales: {
    total: number
    count: number
  }
  expenses: {
    total: number
    count: number
  }
  purchases: {
    total: number
    count: number
  }
  stock: {
    total_value: number
    total_products: number
    products_with_stock: number
    in_stock: number
    low_stock: number
    sold_out: number
  }
  profit: {
    total: number
    margin: number
  }
  period: string
}

export function useDashboardStats(branchId?: string, tenantId?: string, period: 'today' | 'month' | 'all' = 'today') {
  return useQuery({
    queryKey: ['dashboard-stats', branchId, tenantId, period],
    queryFn: async () => {
      const startTime = performance.now()
      let url = '/api/dashboard/stats?'
      if (branchId) url += `branch_id=${branchId}&`
      if (tenantId) url += `tenant_id=${tenantId}&`
      url += `period=${period}`
      
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store', // Always fetch fresh data
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch dashboard stats')
      }
      const data = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Dashboard stats fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return data as DashboardStats
    },
    enabled: !!branchId || !!tenantId, // Only fetch when branch or tenant is available
    staleTime: 10 * 1000, // Cache for 10 seconds (reduced for faster updates)
    gcTime: 30 * 1000, // Keep in cache for 30 seconds (reduced)
    refetchOnWindowFocus: false, // Don't refetch on window focus for better performance
    retry: 1, // Reduce retries for faster failure
  })
}

