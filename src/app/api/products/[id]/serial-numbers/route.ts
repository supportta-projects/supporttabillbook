import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - List serial numbers for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const status = searchParams.get('status')
    const supabase = await createClient()
    
    // Get product to verify permissions
    const { data: product } = await supabase
      .from('products')
      .select('tenant_id, stock_tracking_type')
      .eq('id', id)
      .single()
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'tenant_owner' && user.tenant_id !== product.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    if (product.stock_tracking_type !== 'serial') {
      return NextResponse.json(
        { error: 'This product does not use serial number tracking' },
        { status: 400 }
      )
    }
    
    let query = supabase
      .from('product_serial_numbers')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
    
    if (branchId) {
      query = query.eq('branch_id', branchId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/products/[id]/serial-numbers: ${duration}ms`)
    
    return NextResponse.json({ serial_numbers: data || [] }, {
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
    console.error('[API] GET /api/products/[id]/serial-numbers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch serial numbers' },
      { status: 500 }
    )
  }
}

// POST - Add serial numbers for a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Get product to verify permissions and tracking type
    const { data: product } = await supabase
      .from('products')
      .select('tenant_id, stock_tracking_type')
      .eq('id', id)
      .single()
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only tenant owners can manage serial numbers' },
        { status: 403 }
      )
    }
    
    if (user.role === 'tenant_owner' && user.tenant_id !== product.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    if (product.stock_tracking_type !== 'serial') {
      return NextResponse.json(
        { error: 'This product does not use serial number tracking' },
        { status: 400 }
      )
    }
    
    // Validation
    if (!body.branch_id || !body.serial_numbers || !Array.isArray(body.serial_numbers)) {
      return NextResponse.json(
        { error: 'branch_id and serial_numbers array are required' },
        { status: 400 }
      )
    }
    
    // Verify branch belongs to tenant
    const { data: branch } = await supabase
      .from('branches')
      .select('tenant_id')
      .eq('id', body.branch_id)
      .single()
    
    if (!branch || branch.tenant_id !== product.tenant_id) {
      return NextResponse.json(
        { error: 'Invalid branch' },
        { status: 400 }
      )
    }
    
    // Filter out empty serial numbers and prepare for insertion
    const validSerials = (body.serial_numbers as string[])
      .map(s => s.trim())
      .filter(s => s !== '')
    
    if (validSerials.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid serial number is required' },
        { status: 400 }
      )
    }
    
    // Check for duplicates within the input
    const duplicatesInInput = validSerials.filter((serial, index) => 
      validSerials.indexOf(serial) !== index
    )
    if (duplicatesInInput.length > 0) {
      return NextResponse.json(
        { 
          error: 'Duplicate serial numbers in input',
          duplicates: [...new Set(duplicatesInInput)]
        },
        { status: 400 }
      )
    }
    
    // Prepare serial numbers for insertion
    const serialNumbersToInsert = validSerials.map((serial: string) => ({
      tenant_id: product.tenant_id,
      branch_id: body.branch_id,
      product_id: id,
      serial_number: serial,
      status: 'available',
    }))
    
    // Check for duplicates in database
    const existingSerials = await supabase
      .from('product_serial_numbers')
      .select('serial_number')
      .eq('product_id', id)
      .eq('branch_id', body.branch_id)
      .in('serial_number', serialNumbersToInsert.map((s: { serial_number: string }) => s.serial_number))
    
    if (existingSerials.data && existingSerials.data.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some serial numbers already exist',
          duplicates: existingSerials.data.map(s => s.serial_number)
        },
        { status: 400 }
      )
    }
    
    // Insert serial numbers and update current_stock in parallel
    const [insertResult, currentStockResult] = await Promise.all([
      supabase
        .from('product_serial_numbers')
        .insert(serialNumbersToInsert)
        .select(),
      supabase
        .from('current_stock')
        .select('*')
        .eq('branch_id', body.branch_id)
        .eq('product_id', id)
        .single()
    ])
    
    if (insertResult.error) throw insertResult.error
    
    // Update current_stock: count available serial numbers for this product and branch
    const { count: availableCount } = await supabase
      .from('product_serial_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('branch_id', body.branch_id)
      .eq('status', 'available')
    
    const newStockCount = availableCount || 0
    const previousStockCount = currentStockResult.data?.quantity || 0
    
    if (currentStockResult.data) {
      // Update existing stock record
      await supabase
        .from('current_stock')
        .update({ quantity: newStockCount })
        .eq('id', currentStockResult.data.id)
    } else {
      // Create new stock record
      await supabase
        .from('current_stock')
        .insert({
          tenant_id: product.tenant_id,
          branch_id: body.branch_id,
          product_id: id,
          quantity: newStockCount,
        })
    }
    
    // Auto-active logic: If stock was 0 and now has stock, activate product
    if (previousStockCount === 0 && newStockCount > 0) {
      const { data: productData } = await supabase
        .from('products')
        .select('is_active')
        .eq('id', id)
        .single()
      
      if (productData && !productData.is_active) {
        await supabase
          .from('products')
          .update({ is_active: true })
          .eq('id', id)
          .eq('tenant_id', product.tenant_id)
      }
    }
    
    const duration = Date.now() - startTime
    if (duration > 10) {
      console.warn(`[PERF] POST /api/products/[id]/serial-numbers: ${duration}ms (target: <10ms)`)
    }
    
    return NextResponse.json({ serial_numbers: insertResult.data }, { status: 201 })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] POST /api/products/[id]/serial-numbers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add serial numbers' },
      { status: 500 }
    )
  }
}

