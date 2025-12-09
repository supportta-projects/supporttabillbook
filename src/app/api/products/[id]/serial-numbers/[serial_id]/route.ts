import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// DELETE - Remove a serial number
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serial_id: string }> }
) {
  const { id, serial_id } = await params
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get serial number to verify permissions
    const { data: serialNumber } = await supabase
      .from('product_serial_numbers')
      .select('*, products:product_id(tenant_id)')
      .eq('id', serial_id)
      .eq('product_id', id)
      .single()
    
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only tenant owners can delete serial numbers' },
        { status: 403 }
      )
    }
    
    const product = serialNumber.products as any
    if (user.role === 'tenant_owner' && user.tenant_id !== product.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Prevent deletion of sold serial numbers
    if (serialNumber.status === 'sold') {
      return NextResponse.json(
        { error: 'Cannot delete sold serial numbers' },
        { status: 400 }
      )
    }
    
    // Delete serial number and update stock count
    const { error } = await supabase
      .from('product_serial_numbers')
      .delete()
      .eq('id', serial_id)
    
    if (error) throw error
    
    // Update current_stock: count available serial numbers for this product and branch
    const { count: availableCount } = await supabase
      .from('product_serial_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('branch_id', serialNumber.branch_id)
      .eq('status', 'available')
    
    const newStockCount = availableCount || 0
    
    // Update current_stock
    const { data: currentStock } = await supabase
      .from('current_stock')
      .select('*')
      .eq('branch_id', serialNumber.branch_id)
      .eq('product_id', id)
      .single()
    
    const previousStockCount = currentStock?.quantity || 0
    
    if (currentStock) {
      await supabase
        .from('current_stock')
        .update({ quantity: newStockCount })
        .eq('id', currentStock.id)
    } else if (newStockCount > 0) {
      // Create stock record if it doesn't exist but there are still serials
      const product = serialNumber.products as any
      await supabase
        .from('current_stock')
        .insert({
          tenant_id: product.tenant_id,
          branch_id: serialNumber.branch_id,
          product_id: id,
          quantity: newStockCount,
        })
    }
    
    // Auto-inactive logic: If stock reaches 0, set product to inactive
    if (newStockCount === 0 && previousStockCount > 0) {
      const product = serialNumber.products as any
      await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', product.tenant_id)
    }
    
    const duration = Date.now() - startTime
    if (duration > 10) {
      console.warn(`[PERF] DELETE /api/products/[id]/serial-numbers/[serial_id]: ${duration}ms (target: <10ms)`)
    }
    
    return NextResponse.json({ success: true }, {
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
    console.error('[API] DELETE /api/products/[id]/serial-numbers/[serial_id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete serial number' },
      { status: 500 }
    )
  }
}

