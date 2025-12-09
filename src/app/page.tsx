'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCurrentUser } from '@/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuthStore()
  useCurrentUser() // Fetch user if not in store

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        // Redirect to shop login by default
        router.push('/login')
        return
      }

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
    }
  }, [isAuthenticated, user, isLoading, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
