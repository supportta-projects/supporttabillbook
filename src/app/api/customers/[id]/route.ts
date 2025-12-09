import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // Check permissions
    if (user.role !== 'superadmin' && data.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ customer: data })
  } catch (error: any) {
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/customers/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PUT - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    
    const { name, phone, email, address, gst_number, is_active } = body
    
    const supabase = await createClient()
    
    // First check if customer exists and user has permission
    const { data: existing } = await supabase
      .from('customers')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    if (user.role !== 'superadmin' && existing.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone || null
    if (email !== undefined) updates.email = email || null
    if (address !== undefined) updates.address = address || null
    if (gst_number !== undefined) updates.gst_number = gst_number || null
    if (is_active !== undefined) updates.is_active = is_active
    
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
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
    console.error('[API] PUT /api/customers/[id] error:', error)
    
    if (error?.code === '23505' || error?.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const supabase = await createClient()
    
    // Check if customer exists and user has permission
    const { data: existing } = await supabase
      .from('customers')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    if (user.role !== 'superadmin' && existing.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Check if customer has associated bills
    const { data: bills } = await supabase
      .from('bills')
      .select('id')
      .or(`customer_name.ilike.%${existing.tenant_id}%,customer_phone.ilike.%${existing.tenant_id}%`)
      .limit(1)
    
    if (bills && bills.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with associated bills. Deactivate instead.' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] DELETE /api/customers/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    )
  }
}

