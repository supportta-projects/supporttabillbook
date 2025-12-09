'use client'

import { useState, useEffect } from 'react'
import { useLogin } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/forms/LoginForm'
import { toast } from 'sonner'
import { Shield, Lock } from 'lucide-react'

export default function SuperadminLoginPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const login = useLogin()
  
  const [error, setError] = useState('')

  // Redirect if already authenticated as superadmin
  useEffect(() => {
    // Only redirect if user is actually authenticated and has a role
    if (isAuthenticated && user && user.role) {
      if (user.role === 'superadmin') {
        router.push('/superadmin/dashboard')
      } else {
        // If logged in as non-superadmin, redirect to their dashboard
        switch (user.role) {
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
    }
    // If not authenticated, stay on this page (don't redirect)
  }, [isAuthenticated, user, router])

  const handleSubmit = async (email: string, password: string) => {
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, requireRole: 'superadmin' }),
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
      
      // Verify user is superadmin
      if (data.user?.role !== 'superadmin') {
        throw new Error('Access denied. This login is for superadmin only.')
      }

      // Use the login hook to set user and redirect
      await login.mutateAsync({ email, password, requireRole: 'superadmin' })
      toast.success('Superadmin login successful!')
    } catch (err: any) {
      let errorMessage = 'Invalid credentials or insufficient permissions.'
      
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-red-600 p-4 rounded-full">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Superadmin Portal
          </h1>
          <p className="text-lg text-gray-300">
            Secure System Administration
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-yellow-400">
            <Lock className="h-4 w-4" />
            <p className="text-sm font-semibold">Restricted Access</p>
          </div>
        </div>

        {/* Login Form */}
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={login.isPending}
          error={error}
          title="Superadmin Login"
          description="Enter your superadmin credentials to access the system administration panel"
          allowedRoles={['superadmin']}
        />

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <p className="text-yellow-200 text-sm text-center font-semibold">
            ⚠️ This is a restricted area. Unauthorized access is prohibited.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/login')}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Shop Login
          </button>
        </div>
      </div>
    </div>
  )
}

