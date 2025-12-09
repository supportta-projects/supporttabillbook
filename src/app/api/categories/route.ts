import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - List categories (optimized for performance)
export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Optimized query - only select needed fields, use index
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, code, description, is_active, created_at')
      .eq('tenant_id', user.tenant_id!)
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/categories: ${duration}ms`)
    
    return NextResponse.json({ categories: data || [] }, {
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
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - Create category (optimized)
export async function POST(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Validation
    if (!body.name || !body.tenant_id) {
      return NextResponse.json(
        { error: 'Name and tenant_id are required' },
        { status: 400 }
      )
    }
    
    // Check permissions
    if (user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only tenant owners can create categories' },
        { status: 403 }
      )
    }
    
    // Check if code already exists (if provided)
    if (body.code) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('tenant_id', body.tenant_id)
        .eq('code', body.code.toUpperCase())
        .single()
      
      if (existing) {
        return NextResponse.json(
          { error: 'Category code already exists' },
          { status: 400 }
        )
      }
    }
    
    // Create category
    const { data, error } = await supabase
      .from('categories')
      .insert({
        tenant_id: body.tenant_id,
        name: body.name.trim(),
        code: body.code?.trim().toUpperCase() || null,
        description: body.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single()
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] POST /api/categories: ${duration}ms`)
    
    return NextResponse.json({ category: data }, { 
      status: 201,
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
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    )
  }
}

