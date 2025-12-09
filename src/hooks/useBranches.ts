import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Branch } from '@/types'

export interface CreateBranchResult {
  branch: Branch
  admin?: {
    id: string
    email: string
    full_name: string
    role: string
  } | null
  message: string
}

export function useBranches(tenantId?: string) {
  return useQuery({
    queryKey: ['branches', tenantId],
    queryFn: async () => {
      const url = tenantId 
        ? `/api/tenants/${tenantId}/branches`
        : '/api/branches'
      
      const response = await fetch(url, {
        credentials: 'include', // Include cookies for authentication
      })
      
      if (!response.ok) {
        // Handle 401 Unauthorized - session expired
        if (response.status === 401) {
          // Clear any stale auth state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
          throw new Error('Your session has expired. Please log in again.')
        }
        
        let errorMessage = 'Failed to fetch branches'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch {
          // If response is not JSON, use status text
          errorMessage = `${response.status} ${response.statusText}`
        }
        
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return (data.branches || []) as Branch[]
    },
    enabled: !!tenantId || true,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (authentication issues)
      if (error?.message?.includes('session has expired') || error?.message?.includes('Unauthorized')) {
        return false
      }
      return failureCount < 2
    },
  })
}

export function useCreateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (branchData: {
      tenant_id: string
      name: string
      code: string
      address?: string
      phone?: string
      create_admin?: boolean
      admin_name?: string
      admin_email?: string
      admin_password?: string
    }): Promise<CreateBranchResult> => {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create branch')
      }

      const data = await response.json()
      return {
        branch: data.branch as Branch,
        admin: data.admin || null,
        message: data.message || 'Branch created successfully',
      }
    },
    onSuccess: (data, variables) => {
      // Optimistic update - update cache immediately
      queryClient.setQueryData(['branches', variables.tenant_id], (old: Branch[] = []) => {
        return [...old, data.branch]
      })
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      // Invalidate users if admin was created
      if (data.admin) {
        queryClient.invalidateQueries({ queryKey: ['users', variables.tenant_id] })
      }
    },
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Branch> & { id: string }) => {
      const response = await fetch(`/api/branches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update branch')
      }

      const data = await response.json()
      return data.branch as Branch
    },
    onSuccess: (data) => {
      // Invalidate specific queries for better performance
      if (data?.tenant_id) {
        queryClient.invalidateQueries({ queryKey: ['branches', data.tenant_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export function useDeleteBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/branches/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete branch')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
