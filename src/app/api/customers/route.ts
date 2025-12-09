import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - List customers
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const is_active = searchParams.get('is_active')
    
    const supabase = await createClient()
    
    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Tenant owners see all customers in their tenant
    if (user.role === 'tenant_owner' && user.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id)
    }
    // Branch admins/staff see customers in their tenant
    else if ((user.role === 'branch_admin' || user.role === 'branch_staff') && user.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id)
    }
    // Superadmin sees all
    else if (user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Filter by active status
    if (is_active !== null && is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }
    
    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return NextResponse.json({ customers: data || [] })
  } catch (error: any) {
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/customers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST - Create customer
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const { name, phone, email, address, gst_number } = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      )
    }
    
    if (!user.tenant_id && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: user.tenant_id,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gst_number: gst_number || null,
        is_active: true,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ customer: data })
  } catch (error: any) {
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] POST /api/customers error:', error)
    
    // Handle unique constraint violation
    if (error?.code === '23505' || error?.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    )
  }
}

