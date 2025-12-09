'use client'

import { useState, useEffect } from 'react'
import { useLogin } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/forms/LoginForm'
import { toast } from 'sonner'
import { Building2, Users } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const login = useLogin()
  
  const [error, setError] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Block superadmin from using this login
      if (user.role === 'superadmin') {
        router.push('/superadmin/login')
        return
      }

      // Redirect based on role
      switch (user.role) {
        case 'tenant_owner':
          router.push('/owner/dashboard')
          break
        case 'branch_admin':
        case 'branch_staff':
          router.push('/branch/dashboard')
          break
      }
    }
  }, [isAuthenticated, user, router])

  const handleSubmit = async (email: string, password: string) => {
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server error: Invalid response format. Please check server logs.')
      }

      if (!response.ok) {
        try {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Login failed')
        } catch (parseError: any) {
          // If JSON parsing fails, use status text
          throw new Error(`Login failed: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()
      
      // Block superadmin login attempts
      if (data.user?.role === 'superadmin') {
        throw new Error('Superadmin login is not available here. Please use /superadmin/login')
      }

      // Verify user is shop owner or staff
      const allowedRoles = ['tenant_owner', 'branch_admin', 'branch_staff']
      if (!allowedRoles.includes(data.user?.role)) {
        throw new Error('Invalid user role. This login is for shop owners and staff only.')
      }

      // Use the login hook to set user and redirect
      await login.mutateAsync({ email, password })
      toast.success('Login successful!')
    } catch (err: any) {
      let errorMessage = 'Invalid email or password. Please try again.'
      
      if (err.message) {
        errorMessage = err.message
      } else if (err instanceof TypeError && err.message.includes('JSON')) {
        errorMessage = 'Server error: Unable to process response. Please check if the API route is working.'
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Login error:', err)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Building2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            Supportta Bill Book
          </h1>
          <p className="text-xl text-gray-600">
            Simple Billing & Stock Management
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Shop Owners & Staff</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={login.isPending}
          error={error}
          title="Shop Login"
          description="Sign in to manage your shop, branches, stock, and billing"
          allowedRoles={['tenant_owner', 'branch_admin', 'branch_staff']}
        />

        {/* Help Text */}
        <div className="text-center text-sm text-gray-600 mt-6">
          <p>Need help? Contact your administrator</p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-600">
          <p className="text-sm">© 2024 Supportta Bill Book. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
