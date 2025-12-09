import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CurrentStock, StockLedger } from '@/types'

export function useCurrentStock(branchId?: string, tenantId?: string) {
  return useQuery({
    queryKey: ['stock', branchId, tenantId],
    queryFn: async () => {
      let url = '/api/stock'
      const params = new URLSearchParams()
      if (branchId) params.append('branch_id', branchId)
      if (tenantId) params.append('tenant_id', tenantId)
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
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch stock')
      }
      const data = await response.json()
      return data.stock as CurrentStock[]
    },
    enabled: !!branchId || !!tenantId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('session has expired') || error?.message?.includes('Unauthorized')) {
        return false
      }
      return failureCount < 2
    },
  })
}

export function useStockLedger(branchId: string, productId?: string) {
  return useQuery({
    queryKey: ['stock-ledger', branchId, productId],
    queryFn: async () => {
      let url = `/api/stock/ledger?branch_id=${branchId}`
      if (productId) {
        url += `&product_id=${productId}`
      }
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch stock ledger')
      }
      const data = await response.json()
      return data.ledger as StockLedger[]
    },
    enabled: !!branchId,
  })
}

export function useStockIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      branch_id: string
      product_id: string
      quantity: number
      reason?: string
      reference_id?: string
    }) => {
      const response = await fetch('/api/stock/in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add stock')
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['stock-ledger', variables.branch_id] })
    },
  })
}

export function useStockOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      branch_id: string
      product_id: string
      quantity: number
      reason?: string
      reference_id?: string
    }) => {
      const response = await fetch('/api/stock/out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove stock')
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['stock-ledger', variables.branch_id] })
    },
  })
}

export function useStockAdjust() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      branch_id: string
      product_id: string
      new_quantity: number
      reason: string
    }) => {
      const response = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to adjust stock')
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['stock-ledger', variables.branch_id] })
    },
  })
}

