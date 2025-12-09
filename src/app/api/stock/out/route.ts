import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// POST - Remove stock (stock out)
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Validation
    if (!body.branch_id || !body.product_id || !body.quantity) {
      return NextResponse.json(
        { error: 'branch_id, product_id, and quantity are required' },
        { status: 400 }
      )
    }
    
    // Check permissions
    if (user.role === 'branch_staff' && user.branch_id !== body.branch_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Get branch to get tenant_id
    const { data: branch } = await supabase
      .from('branches')
      .select('tenant_id')
      .eq('id', body.branch_id)
      .single()
    
    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }
    
    // Get current stock
    const { data: currentStock } = await supabase
      .from('current_stock')
      .select('*')
      .eq('branch_id', body.branch_id)
      .eq('product_id', body.product_id)
      .single()
    
    if (!currentStock || currentStock.quantity < parseInt(body.quantity)) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      )
    }
    
    const previousStock = currentStock.quantity
    const newStock = previousStock - parseInt(body.quantity)
    
    // Create ledger entry
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('stock_ledger')
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: body.branch_id,
        product_id: body.product_id,
        transaction_type: 'stock_out',
        quantity: -parseInt(body.quantity),
        previous_stock: previousStock,
        current_stock: newStock,
        reference_id: body.reference_id || null,
        reason: body.reason || null,
        created_by: user.id,
      })
      .select()
      .single()
    
    if (ledgerError) throw ledgerError
    
    // Update current stock
    const { error: updateError } = await supabase
      .from('current_stock')
      .update({ quantity: newStock })
      .eq('id', currentStock.id)
    
    if (updateError) throw updateError
    
    // Auto-inactive logic: If stock reaches 0, set product to inactive
    if (newStock === 0) {
      await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', body.product_id)
        .eq('tenant_id', branch.tenant_id)
    }
    
    return NextResponse.json({ ledgerEntry }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to remove stock' },
      { status: 500 }
    )
  }
}

