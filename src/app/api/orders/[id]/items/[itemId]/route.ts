import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// PUT - Update order item (price, discount, quantity)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Fetch bill to check permissions
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single()
    
    if (billError || !bill) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Check permissions
    if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (user.branch_id !== bill.branch_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else if (user.role === 'tenant_owner') {
      if (user.tenant_id !== bill.tenant_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Fetch current item
    const { data: currentItem, error: itemError } = await supabase
      .from('bill_items')
      .select('*')
      .eq('id', itemId)
      .eq('bill_id', id)
      .single()
    
    if (itemError || !currentItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }
    
    // Fetch settings for GST calculation
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('tenant_id', bill.tenant_id)
      .single()
    
    // Calculate new item totals
    const newUnitPrice = parseFloat(body.unit_price) || currentItem.unit_price
    const newDiscount = parseFloat(body.discount) || 0
    const newQuantity = parseInt(body.quantity) || currentItem.quantity
    
    const itemSubtotal = newQuantity * newUnitPrice
    const itemSubtotalAfterDiscount = itemSubtotal - newDiscount
    
    // Calculate GST
    let itemGst = 0
    if (settings?.gst_enabled && settings.gst_percentage > 0) {
      if (settings.gst_type === 'inclusive') {
        itemGst = itemSubtotalAfterDiscount * (settings.gst_percentage / (100 + settings.gst_percentage))
      } else {
        itemGst = itemSubtotalAfterDiscount * (settings.gst_percentage / 100)
      }
    }
    
    let itemTotal = itemSubtotalAfterDiscount
    if (settings?.gst_enabled && settings.gst_type === 'exclusive') {
      itemTotal += itemGst
    }
    
    // Calculate profit
    const purchasePrice = currentItem.purchase_price || 0
    const profitPerUnit = newUnitPrice - purchasePrice
    const itemProfit = profitPerUnit * newQuantity
    
    // Update item
    const { error: updateError } = await supabase
      .from('bill_items')
      .update({
        unit_price: newUnitPrice,
        discount: newDiscount,
        quantity: newQuantity,
        gst_rate: settings?.gst_enabled ? settings.gst_percentage : 0,
        gst_amount: itemGst,
        total_amount: itemTotal,
        profit_amount: itemProfit,
      })
      .eq('id', itemId)
    
    if (updateError) throw updateError
    
    // Recalculate bill totals
    const { data: allItems } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', id)
    
    let newSubtotal = 0
    let newTotalDiscount = 0
    let newTotalGst = 0
    let newTotalProfit = 0
    
    allItems?.forEach((item: any) => {
      newSubtotal += item.quantity * item.unit_price
      newTotalDiscount += item.discount || 0
      newTotalGst += item.gst_amount || 0
      newTotalProfit += item.profit_amount || 0
    })
    
    let newTotalAmount = newSubtotal - newTotalDiscount
    if (settings?.gst_enabled && settings.gst_type === 'exclusive') {
      newTotalAmount += newTotalGst
    }
    
    // Update bill totals
    const { error: billUpdateError } = await supabase
      .from('bills')
      .update({
        subtotal: Math.round(newSubtotal * 100) / 100,
        discount: Math.round(newTotalDiscount * 100) / 100,
        gst_amount: Math.round(newTotalGst * 100) / 100,
        total_amount: Math.round(newTotalAmount * 100) / 100,
        profit_amount: Math.round(newTotalProfit * 100) / 100,
        // Recalculate due amount if needed
        due_amount: Math.max(0, Math.round(newTotalAmount * 100) / 100 - (bill.paid_amount || 0)),
      })
      .eq('id', id)
    
    if (billUpdateError) throw billUpdateError
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Handle Next.js redirect errors
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] PUT /api/orders/[id]/items/[itemId] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update order item' },
      { status: 500 }
    )
  }
}

