'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import Header from './Header'
import Navigation from './Navigation'
import { useAuthStore } from '@/store/authStore'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated } = useAuthStore()

  // Don't show layout on login pages or when not authenticated
  if (!isAuthenticated || !user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] flex flex-col">
          <Navigation />
          
          {/* Bottom section */}
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className="text-xs text-gray-500 mb-2">Quick Links</div>
            <div className="space-y-1">
              <Link href="/profile" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                My Profile
              </Link>
              <Link href="/settings" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Settings
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

