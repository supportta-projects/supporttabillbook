import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { User } from '@/types'

export function useLogin() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password, requireRole }: { email: string; password: string; requireRole?: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, requireRole }),
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response from API:', text.substring(0, 200))
        throw new Error('Server error: Invalid response format. Please check server configuration.')
      }

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.error || 'Login failed')
        } catch (parseError: any) {
          // If JSON parsing fails, use status text
          throw new Error(`Login failed: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()
      return data.user as User
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(['user'], user)
      
      // Redirect based on role
      switch (user.role) {
        case 'superadmin':
          router.push('/superadmin/dashboard')
          break
        case 'tenant_owner':
          router.push('/owner/dashboard')
          break
        case 'branch_admin':
        case 'branch_staff':
          router.push('/branch/dashboard')
          break
        default:
          router.push('/login')
      }
      router.refresh()
    },
  })
}

export function useLogout() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Logout failed')
      }
    },
    onSuccess: () => {
      logout()
      queryClient.clear()
      router.push('/login')
      router.refresh()
    },
  })
}

export function useCurrentUser() {
  const { user, setUser, setLoading, isLoading } = useAuthStore()

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      setLoading(true)
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        setLoading(false)
        setUser(null) // Clear user on error
        return null
      }

      const data = await response.json()
      if (data.user) {
        setUser(data.user as User)
      } else {
        setUser(null)
      }
      setLoading(false)
      return data.user as User | null
    },
    enabled: !user || isLoading, // Fetch if no user OR if still loading (e.g., after refresh)
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

