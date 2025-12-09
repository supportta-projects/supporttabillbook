import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth/utils'

// GET - List products (tenant-scoped)
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Filter by tenant (RLS will handle this, but we can optimize)
    if (user.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return NextResponse.json({ products: data })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST - Create product (tenant owner only)
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Allow tenant owners, branch admins, and branch staff to create products
    if (!['tenant_owner', 'branch_admin', 'branch_staff', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to create products' },
        { status: 403 }
      )
    }
    
    // Validation
    if (!body.name || !body.unit || !body.selling_price || !body.tenant_id) {
      return NextResponse.json(
        { error: 'Name, unit, selling_price, and tenant_id are required' },
        { status: 400 }
      )
    }
    
    // Check permissions - users can only create products for their tenant
    if (user.tenant_id && user.tenant_id !== body.tenant_id) {
      return NextResponse.json(
        { error: 'You can only create products for your tenant' },
        { status: 403 }
      )
    }
    
    // For branch users, use their tenant_id
    if (!body.tenant_id && user.tenant_id) {
      body.tenant_id = user.tenant_id
    }
    
    // Check if SKU already exists for this tenant
    if (body.sku) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('tenant_id', body.tenant_id)
        .eq('sku', body.sku)
        .single()
      
      if (existing) {
        return NextResponse.json(
          { error: 'SKU already exists for this tenant' },
          { status: 400 }
        )
      }
    }
    
    // Create product
    const { data, error } = await supabase
      .from('products')
      .insert({
        tenant_id: body.tenant_id,
        name: body.name.trim(),
        sku: body.sku?.trim() || null,
        unit: body.unit.trim(),
        selling_price: parseFloat(body.selling_price),
        purchase_price: body.purchase_price ? parseFloat(body.purchase_price) : null,
        gst_rate: body.gst_rate ? parseFloat(body.gst_rate) : 0,
        min_stock: body.min_stock ? parseInt(body.min_stock) : 0,
        description: body.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single()
    
    if (error) throw error
    return NextResponse.json({ product: data }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}

