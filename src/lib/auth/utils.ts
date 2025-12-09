import { createClient } from '@/lib/supabase/server'
import { User } from '@/types'
import { redirect } from 'next/navigation'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) return null

    // Fetch user profile from database
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !userProfile) return null

    return userProfile as User
  } catch (error) {
    // During build time or if Supabase is not configured, return null
    // This allows pages to be built without requiring actual auth
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireRole(requiredRole: string) {
  const user = await requireAuth()
  
  const roleHierarchy: Record<string, number> = {
    superadmin: 4,
    tenant_owner: 3,
    branch_admin: 2,
    branch_staff: 1,
  }

  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    redirect('/unauthorized')
  }

  return user
}

