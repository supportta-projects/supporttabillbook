import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - List bills
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const supabase = await createClient()
    
    if (!branchId) {
      return NextResponse.json(
        { error: 'branch_id is required' },
        { status: 400 }
      )
    }
    
    // Check permissions
    if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (user.branch_id !== branchId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return NextResponse.json({ bills: data })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

// POST - Create bill
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Validation
    if (!body.branch_id || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'branch_id and items are required' },
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
      .select('tenant_id, code')
      .eq('id', body.branch_id)
      .single()
    
    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }
    
    // Validate stock before creating bill
    for (const item of body.items) {
      const { data: stock } = await supabase
        .from('current_stock')
        .select('quantity')
        .eq('branch_id', body.branch_id)
        .eq('product_id', item.product_id)
        .single()
      
      if (!stock || stock.quantity < item.quantity) {
        const { data: product } = await supabase
          .from('products')
          .select('name')
          .eq('id', item.product_id)
          .single()
        
        return NextResponse.json(
          { error: `Insufficient stock for ${product?.name || 'product'}. Available: ${stock?.quantity || 0}, Required: ${item.quantity}` },
          { status: 400 }
        )
      }
    }
    
    // Generate invoice number
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    
    const { count } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', body.branch_id)
      .gte('created_at', startOfDay.toISOString())
    
    const sequence = ((count || 0) + 1).toString().padStart(4, '0')
    const invoiceNumber = `${branch.code}-${dateStr}-${sequence}`
    
    // Calculate totals
    let subtotal = 0
    let totalGst = 0
    let totalDiscount = 0
    
    body.items.forEach((item: any) => {
      const itemSubtotal = item.quantity * item.unit_price
      const itemDiscount = item.discount || 0
      const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
      const itemGst = (itemSubtotalAfterDiscount * (item.gst_rate || 0)) / 100
      
      subtotal += itemSubtotal
      totalDiscount += itemDiscount
      totalGst += itemGst
    })
    
    const totalAmount = subtotal - totalDiscount + totalGst
    
    // Create bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: body.branch_id,
        invoice_number: invoiceNumber,
        customer_name: body.customer_name || null,
        customer_phone: body.customer_phone || null,
        subtotal: Math.round(subtotal * 100) / 100,
        gst_amount: Math.round(totalGst * 100) / 100,
        discount: Math.round(totalDiscount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        payment_mode: body.payment_mode || 'cash',
        created_by: user.id,
      })
      .select()
      .single()
    
    if (billError) throw billError
    
    // Create bill items and update stock
    const billItems = []
    for (const item of body.items) {
      const itemSubtotal = item.quantity * item.unit_price
      const itemDiscount = item.discount || 0
      const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
      const itemGst = (itemSubtotalAfterDiscount * (item.gst_rate || 0)) / 100
      const itemTotal = itemSubtotalAfterDiscount + itemGst
      
      const { data: billItem, error: itemError } = await supabase
        .from('bill_items')
        .insert({
          bill_id: bill.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          gst_rate: item.gst_rate || 0,
          gst_amount: Math.round(itemGst * 100) / 100,
          discount: itemDiscount,
          total_amount: Math.round(itemTotal * 100) / 100,
        })
        .select()
        .single()
      
      if (itemError) throw itemError
      billItems.push(billItem)
      
      // Stock out
      const { data: currentStock } = await supabase
        .from('current_stock')
        .select('*')
        .eq('branch_id', body.branch_id)
        .eq('product_id', item.product_id)
        .single()
      
      if (currentStock) {
        const newStock = currentStock.quantity - item.quantity
        
        // Create ledger entry
        await supabase
          .from('stock_ledger')
          .insert({
            tenant_id: branch.tenant_id,
            branch_id: body.branch_id,
            product_id: item.product_id,
            transaction_type: 'billing',
            quantity: -item.quantity,
            previous_stock: currentStock.quantity,
            current_stock: newStock,
            reference_id: bill.id,
            reason: `Billing - Invoice ${invoiceNumber}`,
            created_by: user.id,
          })
        
        // Update stock
        await supabase
          .from('current_stock')
          .update({ quantity: newStock })
          .eq('id', currentStock.id)
      }
    }
    
    return NextResponse.json({ bill, items: billItems }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create bill' },
      { status: 500 }
    )
  }
}

