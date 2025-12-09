import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get single product with category and brand relations
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
      .eq('id', id)
      .single()
    
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/products/[id]: ${duration}ms`)
    
    return NextResponse.json({ product: data }, {
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
    console.error('[API] GET /api/products/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PUT - Update product (tenant owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Get existing product to check permissions
    const { data: existingProduct } = await supabase
      .from('products')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only tenant owners can update products' },
        { status: 403 }
      )
    }
    
    if (user.role === 'tenant_owner' && user.tenant_id !== existingProduct.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Build update object
    const updates: any = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.category_id !== undefined) updates.category_id = body.category_id || null
    if (body.brand_id !== undefined) updates.brand_id = body.brand_id || null
    if (body.sku !== undefined) updates.sku = body.sku?.trim() || null
    if (body.unit !== undefined) updates.unit = body.unit.trim()
    if (body.selling_price !== undefined) updates.selling_price = parseFloat(body.selling_price)
    if (body.purchase_price !== undefined) updates.purchase_price = body.purchase_price ? parseFloat(body.purchase_price) : null
    if (body.gst_rate !== undefined) updates.gst_rate = parseFloat(body.gst_rate)
    if (body.min_stock !== undefined) updates.min_stock = parseInt(body.min_stock)
    if (body.description !== undefined) updates.description = body.description?.trim() || null
    if (body.stock_tracking_type !== undefined) updates.stock_tracking_type = body.stock_tracking_type
    if (body.is_active !== undefined) updates.is_active = body.is_active
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
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
    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE - Delete product (tenant owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get existing product to check permissions
    const { data: existingProduct } = await supabase
      .from('products')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    if (user.role === 'tenant_owner' && user.tenant_id !== existingProduct.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Check if product has stock or bills associated
    const { data: stockData } = await supabase
      .from('current_stock')
      .select('id')
      .eq('product_id', id)
      .limit(1)
    
    const { data: billItems } = await supabase
      .from('bill_items')
      .select('id')
      .eq('product_id', id)
      .limit(1)
    
    if (stockData && stockData.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing stock. Please remove stock first.' },
        { status: 400 }
      )
    }
    
    if (billItems && billItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with sales history. Consider disabling it instead.' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}

