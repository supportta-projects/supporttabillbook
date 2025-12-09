import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProductSerialNumber } from '@/types'

export function useSerialNumbers(productId: string, branchId?: string, status?: string) {
  return useQuery({
    queryKey: ['serial-numbers', productId, branchId, status],
    queryFn: async () => {
      let url = `/api/products/${productId}/serial-numbers`
      const params = new URLSearchParams()
      if (branchId) params.append('branch_id', branchId)
      if (status) params.append('status', status)
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
        throw new Error(error.error || 'Failed to fetch serial numbers')
      }
      
      const data = await response.json()
      return data.serial_numbers as ProductSerialNumber[]
    },
    enabled: !!productId,
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

export function useAddSerialNumbers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      productId,
      branchId,
      serialNumbers,
    }: {
      productId: string
      branchId: string
      serialNumbers: string[]
    }) => {
      const response = await fetch(`/api/products/${productId}/serial-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          branch_id: branchId,
          serial_numbers: serialNumbers,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
          throw new Error('Your session has expired. Please log in again.')
        }
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to add serial numbers')
      }

      const data = await response.json()
      return data.serial_numbers as ProductSerialNumber[]
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serial-numbers', variables.productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] }) // Invalidate stock to refresh counts
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }) // Invalidate dashboard stats
    },
  })
}

export function useDeleteSerialNumber() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productId, serialId }: { productId: string; serialId: string }) => {
      const response = await fetch(`/api/products/${productId}/serial-numbers/${serialId}`, {
        method: 'DELETE',
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
        throw new Error(error.error || 'Failed to delete serial number')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serial-numbers', variables.productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] }) // Invalidate stock to refresh counts
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }) // Invalidate dashboard stats
    },
  })
}

