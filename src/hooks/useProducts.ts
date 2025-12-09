import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Product } from '@/types'

export function useProducts(filters?: {
  category_id?: string
  brand_id?: string
  is_active?: boolean
}) {
  return useQuery({
    // Use primitive values in query key to ensure stability
    queryKey: ['products', filters?.category_id, filters?.brand_id, filters?.is_active],
    queryFn: async () => {
      const startTime = performance.now()
      let url = '/api/products'
      const params = new URLSearchParams()
      if (filters?.category_id) params.append('category_id', filters.category_id)
      if (filters?.brand_id) params.append('brand_id', filters.brand_id)
      if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
      if (params.toString()) url += `?${params.toString()}`
      
      const response = await fetch(url, {
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
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch products')
      }
      
      const data = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Products fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return data.products as Product[]
    },
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

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const startTime = performance.now()
      const response = await fetch(`/api/products/${productId}`, {
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
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch product')
      }
      
      const data = await response.json()
      const duration = performance.now() - startTime
      if (duration > 10) {
        console.warn(`[PERF] Product fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return data.product as Product
    },
    enabled: !!productId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productData: {
      tenant_id: string
      category_id?: string
      brand_id?: string
      name: string
      sku?: string
      unit: string
      selling_price: number
      purchase_price?: number
      gst_rate?: number
      min_stock?: number
      description?: string
      stock_tracking_type?: 'quantity' | 'serial'
      is_active?: boolean
    }) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
          throw new Error('Your session has expired. Please log in again.')
        }
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to create product')
      }

      const data = await response.json()
      return data.product as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update product')
      }

      const data = await response.json()
      return data.product as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, {
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
        throw new Error(error.error || 'Failed to delete product')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useToggleProductActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await fetch(`/api/products/${id}/toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
          throw new Error('Your session has expired. Please log in again.')
        }
        
        const error = await response.json()
        throw new Error(error.error || 'Failed to update product status')
      }

      const data = await response.json()
      return data.product as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
    },
  })
}

