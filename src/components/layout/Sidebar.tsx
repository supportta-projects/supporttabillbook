'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button-shadcn'

interface NavItem {
  label: string
  href: string
  icon: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const logout = useLogout()

  const navItems: NavItem[] = []

  if (user?.role === 'superadmin') {
    navItems.push(
      { label: 'Dashboard', href: '/superadmin/dashboard', icon: '📊' },
      { label: 'Tenants', href: '/superadmin/tenants', icon: '🏪' },
      { label: 'Reports', href: '/superadmin/reports', icon: '📈' },
      { label: 'Settings', href: '/superadmin/settings', icon: '⚙️' }
    )
  }

  const isActive = (href: string) => pathname === href

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">💰 Biller</h1>
        <p className="text-sm text-gray-400 mt-1">Superadmin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${isActive(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }
            `}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-semibold">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="mb-4">
          <p className="text-sm text-gray-400">Logged in as</p>
          <p className="font-semibold">{user?.full_name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <Button
          onClick={() => logout.mutate()}
          variant="destructive"
          className="w-full"
          disabled={logout.isPending}
        >
          🚪 {logout.isPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </div>
  )
}

