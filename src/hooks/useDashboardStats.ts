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
      let url = '/api/dashboard/stats?'
      if (branchId) url += `branch_id=${branchId}&`
      if (tenantId) url += `tenant_id=${tenantId}&`
      url += `period=${period}`
      
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch dashboard stats')
      }
      const data = await response.json()
      return data as DashboardStats
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  })
}

