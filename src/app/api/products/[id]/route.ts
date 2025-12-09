import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ product: data })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
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
    if (body.sku !== undefined) updates.sku = body.sku?.trim() || null
    if (body.unit !== undefined) updates.unit = body.unit.trim()
    if (body.selling_price !== undefined) updates.selling_price = parseFloat(body.selling_price)
    if (body.purchase_price !== undefined) updates.purchase_price = body.purchase_price ? parseFloat(body.purchase_price) : null
    if (body.gst_rate !== undefined) updates.gst_rate = parseFloat(body.gst_rate)
    if (body.min_stock !== undefined) updates.min_stock = parseInt(body.min_stock)
    if (body.description !== undefined) updates.description = body.description?.trim() || null
    if (body.is_active !== undefined) updates.is_active = body.is_active
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
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

