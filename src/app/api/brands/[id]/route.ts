import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get single brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id!)
      .single()
    
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/brands/${id}: ${duration}ms`)
    
    return NextResponse.json({ brand: data }, {
      headers: {
        'X-Response-Time': `${duration}ms`
      }
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch brand' },
      { status: 500 }
    )
  }
}

// PUT - Update brand
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Get existing brand
    const { data: existing } = await supabase
      .from('brands')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only tenant owners can update brands' },
        { status: 403 }
      )
    }
    
    if (existing.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Prepare update data
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.code !== undefined) updateData.code = body.code?.trim().toUpperCase() || null
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    
    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] PUT /api/brands/${id}: ${duration}ms`)
    
    return NextResponse.json({ brand: data }, {
      headers: {
        'X-Response-Time': `${duration}ms`
      }
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update brand' },
      { status: 500 }
    )
  }
}

// DELETE - Delete brand (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get existing brand
    const { data: existing } = await supabase
      .from('brands')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only tenant owners can delete brands' },
        { status: 403 }
      )
    }
    
    if (existing.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Soft delete
    const { data, error } = await supabase
      .from('brands')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] DELETE /api/brands/${id}: ${duration}ms`)
    
    return NextResponse.json({ brand: data }, {
      headers: {
        'X-Response-Time': `${duration}ms`
      }
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete brand' },
      { status: 500 }
    )
  }
}

