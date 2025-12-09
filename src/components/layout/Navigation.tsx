'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Package, 
  ShoppingCart,
  FileText,
  TrendingUp,
  Settings,
  User as UserIcon,
  Receipt,
  DollarSign,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Tag,
  Boxes
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: any
  roles?: string[]
  children?: NavItem[]
}

const ownerNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/owner/dashboard',
    icon: LayoutDashboard,
    roles: ['tenant_owner'],
  },
  {
    label: 'Order Management',
    href: '/owner/orders',
    icon: Receipt,
    roles: ['tenant_owner'],
  },
  {
    label: 'Products',
    href: '/owner/products',
    icon: Package,
    roles: ['tenant_owner'],
  },
  {
    label: 'Catalogue',
    href: '/owner/catalogue',
    icon: FolderTree,
    roles: ['tenant_owner'],
    children: [
      {
        label: 'Categories',
        href: '/owner/catalogue/categories',
        icon: Tag,
      },
      {
        label: 'Brands',
        href: '/owner/catalogue/brands',
        icon: Boxes,
      },
      {
        label: 'Stock',
        href: '/owner/catalogue/stock',
        icon: Package,
      },
    ],
  },
  {
    label: 'Expenses',
    href: '/owner/expenses',
    icon: DollarSign,
    roles: ['tenant_owner'],
  },
  {
    label: 'Staff',
    href: '/owner/users',
    icon: Users,
    roles: ['tenant_owner'],
  },
  {
    label: 'Branches',
    href: '/owner/branches',
    icon: Building2,
    roles: ['tenant_owner'],
  },
]

const branchNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/branch/dashboard',
    icon: LayoutDashboard,
    roles: ['branch_admin', 'branch_staff'],
  },
  {
    label: 'Stock',
    href: '/branch/stock',
    icon: Package,
    roles: ['branch_admin', 'branch_staff'],
  },
  {
    label: 'Billing',
    href: '/branch/billing',
    icon: ShoppingCart,
    roles: ['branch_admin', 'branch_staff'],
  },
  {
    label: 'Bills',
    href: '/branch/bills',
    icon: FileText,
    roles: ['branch_admin', 'branch_staff'],
  },
  {
    label: 'Purchases',
    href: '/branch/purchases',
    icon: TrendingUp,
    roles: ['branch_admin', 'branch_staff'],
  },
  {
    label: 'Expenses',
    href: '/branch/expenses',
    icon: FileText,
    roles: ['branch_admin', 'branch_staff'],
  },
  {
    label: 'Reports',
    href: '/branch/reports',
    icon: TrendingUp,
    roles: ['branch_admin', 'branch_staff'],
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  if (!user) return null

  // Get nav items based on role
  let navItems: NavItem[] = []
  if (user.role === 'tenant_owner') {
    navItems = ownerNavItems
  } else if (user.role === 'branch_admin' || user.role === 'branch_staff') {
    navItems = branchNavItems
  }

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  )

  const isActive = (href: string) => {
    if (href === '/owner/dashboard' || href === '/branch/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev)
      if (newSet.has(href)) {
        newSet.delete(href)
      } else {
        newSet.add(href)
      }
      return newSet
    })
  }

  // Auto-expand menu if child is active
  const shouldExpand = (item: NavItem) => {
    if (!item.children) return false
    return item.children.some(child => isActive(child.href)) || expandedMenus.has(item.href)
  }

  return (
    <nav className="flex-1 p-4 space-y-1">
      {filteredNavItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        const hasChildren = item.children && item.children.length > 0
        const isExpanded = shouldExpand(item)
        
        if (hasChildren) {
          return (
            <div key={item.href}>
              <button
                onClick={() => toggleMenu(item.href)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all',
                  active || isExpanded
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <span className="font-semibold">{item.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = isActive(child.href)
                    
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm',
                          childActive
                            ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <ChildIcon className="h-4 w-4" />
                        <span>{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
              active
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="font-semibold">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
