import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - List expenses (tenant owner sees all branches, branch users see their branch)
export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const tenantId = searchParams.get('tenant_id')
    const supabase = await createClient()
    
    let query = supabase
      .from('expenses')
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
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
    
    // Tenant owners can see all branches' expenses
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
    } else {
      // Require branch_id for other roles
      if (!branchId) {
        return NextResponse.json(
          { error: 'branch_id is required' },
          { status: 400 }
        )
      }
      query = query.eq('branch_id', branchId)
    }
    
    // Optional filters
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const category = searchParams.get('category')
    
    if (startDate) query = query.gte('expense_date', startDate)
    if (endDate) query = query.lte('expense_date', endDate)
    if (category) query = query.eq('category', category)
    
    const { data, error } = await query
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/expenses: ${duration}ms`)
    
    return NextResponse.json({ expenses: data || [] }, {
      headers: {
        'X-Response-Time': `${duration}ms`
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
    console.error('[API] GET /api/expenses error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

