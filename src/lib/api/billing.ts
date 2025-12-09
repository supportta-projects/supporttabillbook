import { createClient } from '@/lib/supabase/server'
import { Bill, BillItem } from '@/types'
import { addStockOut } from './stock'

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(tenantId: string, branchId: string): Promise<string> {
  const supabase = await createClient()
  
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  // Get branch code
  const { data: branch } = await supabase
    .from('branches')
    .select('code')
    .eq('id', branchId)
    .single()

  const branchCode = branch?.code || 'BR'

  // Count bills today
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('bills')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .gte('created_at', startOfDay.toISOString())

  const sequence = ((count || 0) + 1).toString().padStart(4, '0')
  return `${branchCode}-${dateStr}-${sequence}`
}

/**
 * Calculate totals for bill items
 */
function calculateTotals(items: Array<{
  quantity: number
  unitPrice: number
  gstRate: number
  discount?: number
}>) {
  let subtotal = 0
  let totalGst = 0
  let totalDiscount = 0

  items.forEach(item => {
    const itemSubtotal = item.quantity * item.unitPrice
    const itemDiscount = item.discount || 0
    const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
    const itemGst = (itemSubtotalAfterDiscount * item.gstRate) / 100

    subtotal += itemSubtotal
    totalDiscount += itemDiscount
    totalGst += itemGst
  })

  const total = subtotal - totalDiscount + totalGst

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(totalDiscount * 100) / 100,
    gstAmount: Math.round(totalGst * 100) / 100,
    totalAmount: Math.round(total * 100) / 100,
  }
}

/**
 * Validate stock before creating bill
 */
async function validateStockBeforeBill(
  branchId: string,
  items: Array<{ productId: string; quantity: number }>
) {
  const supabase = await createClient()

  for (const item of items) {
    const { data: stock } = await supabase
      .from('current_stock')
      .select('quantity')
      .eq('branch_id', branchId)
      .eq('product_id', item.productId)
      .single()

    if (!stock || stock.quantity < item.quantity) {
      // Get product name for better error message
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', item.productId)
        .single()
      
      const productName = product?.name || 'Unknown Product'
      throw new Error(`Insufficient stock for ${productName}. Available: ${stock?.quantity || 0}, Required: ${item.quantity}`)
    }
  }
}

/**
 * Create a new bill
 */
export async function createBill(
  branchId: string,
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    gstRate: number
    discount?: number
  }>,
  customerName?: string,
  customerPhone?: string,
  paymentMode: 'cash' | 'card' | 'upi' | 'credit' = 'cash'
): Promise<{ bill: Bill; items: BillItem[]; errors?: string[] }> {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) throw new Error('Unauthorized')

  // Get tenant_id from branch
  const { data: branch } = await supabase
    .from('branches')
    .select('tenant_id')
    .eq('id', branchId)
    .single()

  if (!branch) throw new Error('Branch not found')

  // Validate stock
  await validateStockBeforeBill(
    branchId,
    items.map(item => ({ productId: item.productId, quantity: item.quantity }))
  )

  // Calculate totals
  const totals = calculateTotals(items)

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(branch.tenant_id, branchId)

  // Create bill
  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      tenant_id: branch.tenant_id,
      branch_id: branchId,
      invoice_number: invoiceNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      subtotal: totals.subtotal,
      gst_amount: totals.gstAmount,
      discount: totals.discount,
      total_amount: totals.totalAmount,
      payment_mode: paymentMode,
      created_by: user.data.user.id,
    })
    .select()
    .single()

  if (billError) throw billError
  if (!bill) throw new Error('Failed to create bill')

  // Create bill items and update stock
  const billItems: BillItem[] = []
  const errors: string[] = []

  try {
    for (const item of items) {
      const itemSubtotal = item.quantity * item.unitPrice
      const itemDiscount = item.discount || 0
      const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
      const itemGst = (itemSubtotalAfterDiscount * item.gstRate) / 100
      const itemTotal = itemSubtotalAfterDiscount + itemGst

      const { data: billItem, error: itemError } = await supabase
        .from('bill_items')
        .insert({
          bill_id: bill.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          gst_rate: item.gstRate,
          gst_amount: Math.round(itemGst * 100) / 100,
          discount: itemDiscount,
          total_amount: Math.round(itemTotal * 100) / 100,
        })
        .select()
        .single()

      if (itemError) {
        errors.push(`Failed to create bill item for ${item.productName}: ${itemError.message}`)
        continue
      }
      
      if (!billItem) {
        errors.push(`Failed to create bill item for ${item.productName}`)
        continue
      }

      billItems.push(billItem)

      // Stock out - if this fails, we should rollback or handle it
      try {
        await addStockOut(
          branchId,
          item.productId,
          item.quantity,
          `Billing - Invoice ${invoiceNumber}`,
          bill.id
        )
      } catch (stockError) {
        errors.push(`Failed to update stock for ${item.productName}: ${stockError instanceof Error ? stockError.message : 'Unknown error'}`)
        // Note: Bill is already created, this is a critical error
        // In production, you might want to implement transaction rollback
      }
    }

    if (errors.length > 0) {
      console.error('Bill creation completed with errors:', errors)
      // Return bill but with warnings
      return { bill, items: billItems, errors }
    }

    return { bill: bill as Bill, items: billItems }
  } catch (error) {
    // If critical error, try to delete the bill
    if (bill?.id) {
      await supabase.from('bills').delete().eq('id', bill.id)
    }
    throw error
  }
}

/**
 * Get bill details
 */
export async function getBillDetails(billId: string) {
  const supabase = await createClient()

  const { data: bill, error: billError } = await supabase
    .from('bills')
    .select('*')
    .eq('id', billId)
    .single()

  if (billError) throw billError

  const { data: items, error: itemsError } = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', billId)

  if (itemsError) throw itemsError

  return { bill: bill as Bill, items: items as BillItem[] }
}

/**
 * List bills for a branch
 */
export async function listBills(
  branchId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('bills')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Bill[]
}

