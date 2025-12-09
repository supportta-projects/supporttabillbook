'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import BranchSwitcher from './BranchSwitcher'
import { Button } from '@/components/ui/button-shadcn'
import { User, Settings, LogOut } from 'lucide-react'
import { useLogout } from '@/hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const logout = useLogout()

  // Don't show header on login pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/superadmin/login')) {
    return null
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href={user?.role === 'superadmin' ? '/superadmin/dashboard' : user?.role === 'tenant_owner' ? '/owner/dashboard' : '/branch/dashboard'}>
            <h1 className="text-2xl font-bold text-gray-900">💰 Bill Book</h1>
          </Link>
          
          {/* Branch Switcher for tenant owners */}
          {user?.role === 'tenant_owner' && <BranchSwitcher />}
        </div>

        <div className="flex items-center gap-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{user?.full_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{user?.full_name}</span>
                  <span className="text-xs text-gray-500">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {logout.isPending ? 'Logging out...' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

