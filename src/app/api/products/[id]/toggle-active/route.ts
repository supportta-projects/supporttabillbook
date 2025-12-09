import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// PUT - Toggle product active status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Get existing product to check permissions
    const { data: existingProduct } = await supabase
      .from('products')
      .select('tenant_id, is_active')
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
    
    const newStatus = body.is_active !== undefined ? body.is_active : !existingProduct.is_active
    
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: newStatus })
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
    
    const duration = Date.now() - startTime
    console.log(`[PERF] PUT /api/products/[id]/toggle-active: ${duration}ms`)
    
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
    console.error('[API] PUT /api/products/[id]/toggle-active error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update product status' },
      { status: 500 }
    )
  }
}

