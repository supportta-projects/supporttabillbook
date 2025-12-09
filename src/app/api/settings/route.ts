import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get settings for current tenant
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    if (!user.tenant_id && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }
    
    // Return default settings if none exist
    if (!data) {
      return NextResponse.json({
        settings: {
          tenant_id: user.tenant_id,
          gst_enabled: false,
          gst_number: null,
          gst_type: 'exclusive',
          gst_percentage: 0,
          upi_id: null,
          bank_account_number: null,
          bank_name: null,
          bank_branch: null,
          bank_ifsc_code: null,
        }
      })
    }
    
    return NextResponse.json({ settings: data })
  } catch (error: any) {
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT - Update settings
export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    if (!user.tenant_id && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('tenant_id', user.tenant_id)
      .single()
    
    const updates: any = {
      tenant_id: user.tenant_id,
    }
    
    if (body.gst_enabled !== undefined) updates.gst_enabled = body.gst_enabled
    if (body.gst_number !== undefined) updates.gst_number = body.gst_number || null
    if (body.gst_type !== undefined) updates.gst_type = body.gst_type
    if (body.gst_percentage !== undefined) updates.gst_percentage = body.gst_percentage
    if (body.upi_id !== undefined) updates.upi_id = body.upi_id || null
    if (body.bank_account_number !== undefined) updates.bank_account_number = body.bank_account_number || null
    if (body.bank_name !== undefined) updates.bank_name = body.bank_name || null
    if (body.bank_branch !== undefined) updates.bank_branch = body.bank_branch || null
    if (body.bank_ifsc_code !== undefined) updates.bank_ifsc_code = body.bank_ifsc_code || null
    
    let data
    if (existing) {
      // Update existing
      const { data: updated, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      data = updated
    } else {
      // Insert new
      const { data: inserted, error } = await supabase
        .from('settings')
        .insert(updates)
        .select()
        .single()
      
      if (error) throw error
      data = inserted
    }
    
    return NextResponse.json({ settings: data })
  } catch (error: any) {
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] PUT /api/settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}

