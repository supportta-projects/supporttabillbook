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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100') // Default 100, max reasonable
    const search = searchParams.get('search')?.trim()
    const paymentFilter = searchParams.get('payment_filter') // 'all' | 'paid' | 'due'
    const paymentModeFilter = searchParams.get('payment_mode') // 'all' | 'cash' | 'card' | 'upi' | 'credit'
    
    const supabase = await createClient()
    
    // Optimize: Select only needed fields (reduce payload size)
    let query = supabase
      .from('bills')
      .select(`
        id,
        invoice_number,
        customer_name,
        customer_phone,
        subtotal,
        gst_amount,
        discount,
        total_amount,
        profit_amount,
        paid_amount,
        due_amount,
        payment_mode,
        created_at,
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
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Tenant owners can see all branches' orders
    if (user.role === 'tenant_owner') {
      const finalTenantId = tenantId || user.tenant_id
      if (finalTenantId) {
        if (branchId) {
          // Filter by specific branch if provided
          query = query.eq('branch_id', branchId)
        } else {
          // Optimize: Use tenant_id directly instead of fetching branches first
          query = query.eq('tenant_id', finalTenantId)
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
    
    // Search filter (invoice number, customer name, phone)
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }
    
    // Payment status filter
    if (paymentFilter === 'paid') {
      query = query.eq('due_amount', 0)
    } else if (paymentFilter === 'due') {
      query = query.gt('due_amount', 0)
    }
    
    // Payment mode filter
    if (paymentModeFilter && paymentModeFilter !== 'all') {
      query = query.eq('payment_mode', paymentModeFilter)
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    if (duration > 10) {
      console.warn(`[PERF] GET /api/orders: ${duration}ms (target: <10ms)`)
    }
    
    return NextResponse.json({ 
      orders: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, {
      headers: {
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30', // Cache for 10s, serve stale for 30s
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

