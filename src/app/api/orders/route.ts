import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - List orders/bills (tenant owner sees all branches, branch users see their branch)
export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const tenantId = searchParams.get('tenant_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const supabase = await createClient()
    
    let query = supabase
      .from('bills')
      .select(`
        *,
        branches:branch_id (
          id,
          name,
          code
        ),
        created_by_user:created_by (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
    
    // Tenant owners can see all branches' orders
    if (user.role === 'tenant_owner') {
      const finalTenantId = tenantId || user.tenant_id
      if (finalTenantId) {
        // Get all branches for this tenant
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', finalTenantId)
        
        const branchIds = branches?.map(b => b.id) || []
        if (branchIds.length > 0) {
          if (branchId) {
            // Filter by specific branch if provided
            query = query.eq('branch_id', branchId)
          } else {
            // Show all branches
            query = query.in('branch_id', branchIds)
          }
        } else {
          // No branches, return empty
          query = query.eq('branch_id', 'no-branches')
        }
      }
    }
    // Branch users see only their branch
    else if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      query = query.eq('branch_id', user.branch_id)
    }
    
    // Date filters
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    if (duration > 10) {
      console.warn(`[PERF] GET /api/orders: ${duration}ms (target: <10ms)`)
    }
    
    return NextResponse.json({ orders: data || [] }, {
      headers: {
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/orders error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

