import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User } from '@/types'

export function useUsers(tenantId?: string, branchId?: string) {
  return useQuery({
    queryKey: ['users', tenantId, branchId],
    queryFn: async () => {
      const startTime = performance.now()
      let url = '/api/users'
      const params = new URLSearchParams()
      if (tenantId) params.append('tenant_id', tenantId)
      if (branchId) params.append('branch_id', branchId)
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
        
        let errorMessage = 'Failed to fetch users'
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
        console.warn(`[PERF] Users fetch took ${duration.toFixed(2)}ms (target: <10ms)`)
      }
      return (data.users || []) as User[]
    },
    enabled: !!tenantId || !!branchId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: {
      email: string
      password: string
      full_name: string
      role: 'branch_admin' | 'branch_staff'
      tenant_id: string
      branch_id: string // Now required
    }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      const data = await response.json()
      return data.user as User
    },
    onSuccess: (data, variables) => {
      // Optimistic update for immediate UI feedback
      queryClient.setQueryData(['users', variables.tenant_id, variables.branch_id], (old: User[] = []) => {
        if (old.some(u => u.id === data.id)) return old // Avoid duplicates
        return [...old, data]
      })
      queryClient.setQueryData(['users', variables.tenant_id], (old: User[] = []) => {
        if (old.some(u => u.id === data.id)) return old // Avoid duplicates
        return [...old, data]
      })
      // Invalidate to refetch fresh data in background
      queryClient.invalidateQueries({ queryKey: ['users', variables.tenant_id] })
      queryClient.invalidateQueries({ queryKey: ['users', variables.tenant_id, variables.branch_id] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<User> & { id: string }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      const data = await response.json()
      return data.user as User
    },
    onSuccess: (data) => {
      // Invalidate specific queries for better performance
      if (data.tenant_id) {
        queryClient.invalidateQueries({ queryKey: ['users', data.tenant_id] })
        if (data.branch_id) {
          queryClient.invalidateQueries({ queryKey: ['users', data.tenant_id, data.branch_id] })
        }
      } else {
        // Fallback: invalidate all if tenant_id not provided
        queryClient.invalidateQueries({ queryKey: ['users'] })
      }
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }
      
      const data = await response.json()
      return data.user as User
    },
    onSuccess: (data) => {
      // Invalidate specific queries for better performance
      if (data?.tenant_id) {
        queryClient.invalidateQueries({ queryKey: ['users', data.tenant_id] })
        if (data?.branch_id) {
          queryClient.invalidateQueries({ queryKey: ['users', data.tenant_id, data.branch_id] })
        }
      } else {
        // Fallback: invalidate all
        queryClient.invalidateQueries({ queryKey: ['users'] })
      }
    },
  })
}

