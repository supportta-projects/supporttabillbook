'use client'

import { useTenants } from '@/hooks/useTenants'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/layout/Sidebar'
import PageContainer from '@/components/layout/PageContainer'
import StatCard from '@/components/cards/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, Package, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button-shadcn'

export default function SuperadminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { data: tenants, isLoading } = useTenants()

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'superadmin') {
      router.push('/login')
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || user?.role !== 'superadmin') {
    return null
  }

  const stats = {
    totalTenants: tenants?.length || 0,
    activeTenants: tenants?.filter(t => t.is_active).length || 0,
    totalBranches: 0, // TODO: Add branches count API
    totalUsers: 0, // TODO: Add users count API
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <PageContainer title="📊 Superadmin Dashboard">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tenants"
            value={stats.totalTenants}
            icon={<Building2 />}
            description="All registered shops"
          />
          <StatCard
            title="Active Tenants"
            value={stats.activeTenants}
            icon={<TrendingUp />}
            description="Currently active"
            trend={{
              value: stats.totalTenants > 0 
                ? Math.round((stats.activeTenants / stats.totalTenants) * 100)
                : 0,
              isPositive: true
            }}
          />
          <StatCard
            title="Total Branches"
            value={stats.totalBranches}
            icon={<Building2 />}
            description="Across all tenants"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users />}
            description="System users"
          />
        </div>

        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Tenants</CardTitle>
              <Link href="/superadmin/tenants">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : tenants && tenants.length > 0 ? (
              <div className="space-y-4">
                {tenants.slice(0, 5).map((tenant) => (
                  <Link
                    key={tenant.id}
                    href={`/superadmin/tenants/${tenant.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{tenant.name}</h3>
                      <p className="text-sm text-muted-foreground">Code: {tenant.code}</p>
                      {tenant.email && (
                        <p className="text-xs text-muted-foreground mt-1">📧 {tenant.email}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        tenant.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {tenant.is_active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No tenants yet</p>
                <p className="text-sm mt-2">Create your first tenant to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  )
}
