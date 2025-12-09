'use client'

import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/layout/Sidebar'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'superadmin') {
      router.push('/login')
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || user?.role !== 'superadmin') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <PageContainer title="📈 Reports & Analytics">
        <Card>
          <CardHeader>
            <CardTitle>System Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl">Reports feature coming soon</p>
              <p className="text-sm mt-2">This will include system-wide analytics and reports</p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  )
}
