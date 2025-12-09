import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/utils'

// GET - Get single tenant (superadmin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireRole('superadmin')
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ tenant: data })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenant' },
      { status: 500 }
    )
  }
}

// PUT - Update tenant (superadmin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireRole('superadmin')
    const body = await request.json()
    const supabase = await createClient()
    
    // Build update object
    const updates: any = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.code !== undefined) {
      if (!/^[A-Z0-9_-]+$/.test(body.code.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid code format' },
          { status: 400 }
        )
      }
      updates.code = body.code.trim().toUpperCase()
    }
    if (body.email !== undefined) updates.email = body.email?.trim() || null
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null
    if (body.address !== undefined) updates.address = body.address?.trim() || null
    if (body.is_active !== undefined) updates.is_active = body.is_active
    
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return NextResponse.json({ tenant: data })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update tenant' },
      { status: 500 }
    )
  }
}

// DELETE - Delete tenant (superadmin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireRole('superadmin')
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete tenant' },
      { status: 500 }
    )
  }
}

