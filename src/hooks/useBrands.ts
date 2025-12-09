import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brand } from '@/types'

// Optimized hook with staleTime for caching
export function useBrands(tenantId?: string) {
  return useQuery({
    queryKey: ['brands', tenantId],
    queryFn: async () => {
      const startTime = performance.now()
      const response = await fetch('/api/brands', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch brands')
      }
      const data = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Brands fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return data.brands as Brand[]
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (brandData: {
      tenant_id: string
      name: string
      code?: string
      description?: string
    }) => {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create brand')
      }

      const data = await response.json()
      return data.brand as Brand
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brands', variables.tenant_id] })
    },
  })
}

export function useUpdateBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Brand> & { id: string }) => {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update brand')
      }

      const data = await response.json()
      return data.brand as Brand
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

export function useDeleteBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete brand')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

