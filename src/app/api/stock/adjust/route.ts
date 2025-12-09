import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// POST - Adjust stock (correction)
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Validation
    if (!body.branch_id || !body.product_id || body.new_quantity === undefined || !body.reason) {
      return NextResponse.json(
        { error: 'branch_id, product_id, new_quantity, and reason are required' },
        { status: 400 }
      )
    }
    
    // Check permissions - only branch admins and tenant owners can adjust
    if (user.role === 'branch_staff') {
      return NextResponse.json(
        { error: 'Branch staff cannot adjust stock' },
        { status: 403 }
      )
    }
    
    if (user.role === 'branch_admin' && user.branch_id !== body.branch_id) {
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
    
    const previousStock = currentStock?.quantity || 0
    const newQuantity = parseInt(body.new_quantity)
    const difference = newQuantity - previousStock
    
    // Create ledger entry
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('stock_ledger')
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: body.branch_id,
        product_id: body.product_id,
        transaction_type: 'adjustment',
        quantity: difference,
        previous_stock: previousStock,
        current_stock: newQuantity,
        reason: body.reason,
        created_by: user.id,
      })
      .select()
      .single()
    
    if (ledgerError) throw ledgerError
    
    // Update or insert current stock
    if (currentStock) {
      const { error: updateError } = await supabase
        .from('current_stock')
        .update({ quantity: newQuantity })
        .eq('id', currentStock.id)
      
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase
        .from('current_stock')
        .insert({
          tenant_id: branch.tenant_id,
          branch_id: body.branch_id,
          product_id: body.product_id,
          quantity: newQuantity,
        })
      
      if (insertError) throw insertError
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
      { error: error.message || 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}

