import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get order details with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select(`
        *,
        branches:branch_id (
          id,
          name,
          code,
          address,
          phone,
          tenant_id
        ),
        tenants:tenant_id (
          id,
          name,
          code,
          email,
          phone,
          address
        ),
        created_by_user:created_by (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single()
    
    if (billError) throw billError
    if (!bill) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (user.branch_id !== bill.branch_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else if (user.role === 'tenant_owner') {
      if (user.tenant_id !== bill.tenant_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    const { data: items, error: itemsError } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', id)
      .order('created_at', { ascending: true })
    
    if (itemsError) throw itemsError
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/orders/[id]: ${duration}ms`)
    
    return NextResponse.json({ order: bill, items: items || [] }, {
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
    console.error('[API] GET /api/orders/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

