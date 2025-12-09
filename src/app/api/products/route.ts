import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth/utils'

// GET - List products (tenant-scoped) with category and brand relations
export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const brandId = searchParams.get('brand_id')
    const isActive = searchParams.get('is_active')
    const supabase = await createClient()
    
    let query = supabase
      .from('products')
      .select(`
        *,
        category:category_id (
          id,
          name,
          code
        ),
        brand:brand_id (
          id,
          name,
          code
        )
      `)
      .order('created_at', { ascending: false })
    
    // Filter by tenant (RLS will handle this, but we can optimize)
    if (user.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id)
    }
    
    // Optional filters
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (brandId) {
      query = query.eq('brand_id', brandId)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    if (duration > 10) {
      console.warn(`[PERF] GET /api/products: ${duration}ms (target: <10ms)`)
    }
    
    return NextResponse.json({ products: data || [] }, {
      headers: {
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
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
    console.error('[API] GET /api/products error:', error)
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
        category_id: body.category_id || null,
        brand_id: body.brand_id || null,
        name: body.name.trim(),
        sku: body.sku?.trim() || null,
        unit: body.unit.trim(),
        selling_price: parseFloat(body.selling_price),
        purchase_price: body.purchase_price ? parseFloat(body.purchase_price) : null,
        gst_rate: body.gst_rate ? parseFloat(body.gst_rate) : 0,
        min_stock: body.min_stock ? parseInt(body.min_stock) : 0,
        description: body.description?.trim() || null,
        stock_tracking_type: body.stock_tracking_type || 'quantity',
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select(`
        *,
        category:category_id (
          id,
          name,
          code
        ),
        brand:brand_id (
          id,
          name,
          code
        )
      `)
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

