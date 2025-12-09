import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CurrentStock, StockLedger } from '@/types'

export function useCurrentStock(branchId?: string, tenantId?: string) {
  return useQuery({
    queryKey: ['stock', branchId, tenantId],
    queryFn: async () => {
      const startTime = performance.now()
      let url = '/api/stock'
      const params = new URLSearchParams()
      if (branchId) params.append('branch_id', branchId)
      if (tenantId) params.append('tenant_id', tenantId)
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
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch stock')
      }
      const data = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Stock fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return data.stock as CurrentStock[]
    },
    enabled: !!branchId || !!tenantId,
    staleTime: 10 * 1000, // Reduced cache time for faster updates
    gcTime: 30 * 1000, // Reduced garbage collection time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1, // Reduce retries
    retryDelay: 100, // Faster retry
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
      const startTime = performance.now()
      const response = await fetch('/api/stock/in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add stock')
      }

      const result = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Stock in took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return result
    },
    onMutate: async (variables) => {
      // Optimistic update - update UI immediately
      await queryClient.cancelQueries({ queryKey: ['stock', variables.branch_id] })
      
      const previousStock = queryClient.getQueryData(['stock', variables.branch_id])
      
      // Optimistically update stock
      queryClient.setQueryData(['stock', variables.branch_id], (old: any) => {
        if (!old) return old
        return old.map((item: any) => 
          item.product_id === variables.product_id && item.branch_id === variables.branch_id
            ? { ...item, quantity: (item.quantity || 0) + variables.quantity }
            : item
        )
      })
      
      return { previousStock }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousStock) {
        queryClient.setQueryData(['stock', variables.branch_id], context.previousStock)
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['stock', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['stock-ledger', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
      const startTime = performance.now()
      const response = await fetch('/api/stock/out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove stock')
      }

      const result = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Stock out took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return result
    },
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['stock', variables.branch_id] })
      
      const previousStock = queryClient.getQueryData(['stock', variables.branch_id])
      
      queryClient.setQueryData(['stock', variables.branch_id], (old: any) => {
        if (!old) return old
        return old.map((item: any) => 
          item.product_id === variables.product_id && item.branch_id === variables.branch_id
            ? { ...item, quantity: Math.max(0, (item.quantity || 0) - variables.quantity) }
            : item
        )
      })
      
      return { previousStock }
    },
    onError: (err, variables, context) => {
      if (context?.previousStock) {
        queryClient.setQueryData(['stock', variables.branch_id], context.previousStock)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['stock-ledger', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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

