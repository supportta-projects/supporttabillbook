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
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    console.log('[API] POST /api/bills - Request received:', {
      branch_id: body.branch_id,
      items_count: body.items?.length || 0,
      customer_id: body.customer_id || null,
    })
    
    // Validation
    if (!body.branch_id || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'branch_id and items are required' },
        { status: 400 }
      )
    }
    
    // Validate items structure
    for (const item of body.items) {
      if (!item.product_id || !item.product_name || !item.quantity || !item.unit_price) {
        return NextResponse.json(
          { error: 'Each item must have product_id, product_name, quantity, and unit_price' },
          { status: 400 }
        )
      }
      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for ${item.product_name}. Quantity must be greater than 0.` },
          { status: 400 }
        )
      }
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
    
    // Get GST settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('tenant_id', branch.tenant_id)
      .single()
    
    // Optimize: Fetch products and stock in parallel
    const productIds = body.items.map((item: any) => item.product_id)
    const [productsResult, stockResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, purchase_price, stock_tracking_type')
        .in('id', productIds),
      supabase
        .from('current_stock')
        .select('product_id, quantity')
        .eq('branch_id', body.branch_id)
        .in('product_id', productIds)
    ])
    
    const products = productsResult.data || []
    const stockItems = stockResult.data || []
    const productsMap = new Map(products.map(p => [p.id, p]))
    const stockMap = new Map(stockItems.map(s => [s.product_id, s]))
    
    // Batch fetch serial numbers for all serial-tracked products
    const serialProductIds = body.items
      .filter((item: any) => {
        const product = productsMap.get(item.product_id)
        return product?.stock_tracking_type === 'serial' && item.serial_numbers && Array.isArray(item.serial_numbers)
      })
      .map((item: any) => item.product_id)
    
    let serialsMap = new Map()
    if (serialProductIds.length > 0) {
      // Get all serial numbers for these products in one query
      const allSerials = body.items
        .filter((item: any) => {
          const product = productsMap.get(item.product_id)
          return product?.stock_tracking_type === 'serial' && item.serial_numbers
        })
        .flatMap((item: any) => item.serial_numbers)
      
      if (allSerials.length > 0) {
        const { data: serials } = await supabase
          .from('product_serial_numbers')
          .select('product_id, serial_number, status')
          .eq('branch_id', body.branch_id)
          .in('product_id', serialProductIds)
          .in('serial_number', allSerials)
        
        // Group by product_id
        serials?.forEach((s: any) => {
          if (!serialsMap.has(s.product_id)) {
            serialsMap.set(s.product_id, [])
          }
          serialsMap.get(s.product_id)?.push(s)
        })
      }
    }
    
    // Validate stock before creating bill (using cached data)
    for (const item of body.items) {
      const product = productsMap.get(item.product_id)
      
      // For serial-tracked products, validate serial numbers
      if (product?.stock_tracking_type === 'serial' && item.serial_numbers && Array.isArray(item.serial_numbers)) {
        if (item.serial_numbers.length !== item.quantity) {
          return NextResponse.json(
            { error: `Quantity mismatch for ${product.name}. Selected ${item.serial_numbers.length} serials but quantity is ${item.quantity}` },
            { status: 400 }
          )
        }
        
        // Check serials from cached map
        const productSerials = serialsMap.get(item.product_id) || []
        const serialNumbers = productSerials.map((s: any) => s.serial_number)
        
        if (productSerials.length !== item.serial_numbers.length) {
          return NextResponse.json(
            { error: `Some serial numbers are not available for ${product.name}` },
            { status: 400 }
          )
        }
        
        const unavailableSerials = productSerials.filter((s: any) => s.status !== 'available')
        if (unavailableSerials.length > 0) {
          return NextResponse.json(
            { error: `Some serial numbers are already sold: ${unavailableSerials.map((s: any) => s.serial_number).join(', ')}` },
            { status: 400 }
          )
        }
      } else {
        // Quantity-based stock validation (using cached stock)
        const stock = stockMap.get(item.product_id)
        
        if (!stock || stock.quantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product?.name || 'product'}. Available: ${stock?.quantity || 0}, Required: ${item.quantity}` },
            { status: 400 }
          )
        }
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
    
    // Calculate totals with GST from settings
    let subtotal = 0
    let totalGst = 0
    let totalDiscount = 0
    let totalProfit = 0
    
    body.items.forEach((item: any) => {
      const product = productsMap.get(item.product_id)
      const purchasePrice = product?.purchase_price || 0
      
      const itemSubtotal = item.quantity * item.unit_price
      const itemDiscount = item.discount || 0
      const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
      
      // Calculate GST from settings (not per-item)
      let itemGst = 0
      if (settings?.gst_enabled && settings.gst_percentage > 0) {
        if (settings.gst_type === 'inclusive') {
          // GST is included in price
          itemGst = itemSubtotalAfterDiscount * (settings.gst_percentage / (100 + settings.gst_percentage))
        } else {
          // GST is exclusive (added on top)
          itemGst = itemSubtotalAfterDiscount * (settings.gst_percentage / 100)
        }
      }
      
      // Calculate profit per item
      const profitPerUnit = item.unit_price - purchasePrice
      const itemProfit = profitPerUnit * item.quantity
      
      subtotal += itemSubtotal
      totalDiscount += itemDiscount
      totalGst += itemGst
      totalProfit += itemProfit
    })
    
    // Add overall discount if provided
    const overallDiscount = parseFloat(body.overall_discount) || 0
    totalDiscount += overallDiscount
    
    // Calculate total amount based on GST type
    let totalAmount = subtotal - totalDiscount
    if (settings?.gst_enabled && settings.gst_type === 'exclusive') {
      totalAmount += totalGst
    }
    
    // Determine initial payment status
    // If payment_mode is 'credit', set paid_amount = 0, due_amount = total_amount
    // Otherwise, set paid_amount = total_amount, due_amount = 0
    const paymentMode = body.payment_mode || 'cash'
    const initialPaidAmount = paymentMode === 'credit' ? 0 : Math.round(totalAmount * 100) / 100
    const initialDueAmount = paymentMode === 'credit' ? Math.round(totalAmount * 100) / 100 : 0
    
    // Create bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: body.branch_id,
        invoice_number: invoiceNumber,
        customer_id: body.customer_id || null,
        customer_name: body.customer_name || null,
        customer_phone: body.customer_phone || null,
        subtotal: Math.round(subtotal * 100) / 100,
        gst_amount: Math.round(totalGst * 100) / 100,
        discount: Math.round(totalDiscount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        profit_amount: Math.round(totalProfit * 100) / 100,
        paid_amount: initialPaidAmount,
        due_amount: initialDueAmount,
        payment_mode: paymentMode,
        created_by: user.id,
      })
      .select()
      .single()
    
    if (billError) throw billError
    
    // Optimize: Prepare all stock updates in parallel
    const ledgerEntries: Array<any> = []
    
    // Create bill items first
    const billItems = []
    for (const item of body.items) {
      const product = productsMap.get(item.product_id)
      const purchasePrice = product?.purchase_price || 0
      
      const itemSubtotal = item.quantity * item.unit_price
      const itemDiscount = item.discount || 0
      const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
      
      // Calculate GST from settings
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
      const profitPerUnit = item.unit_price - purchasePrice
      const itemProfit = profitPerUnit * item.quantity
      
      const { data: billItem, error: itemError } = await supabase
        .from('bill_items')
        .insert({
          bill_id: bill.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchase_price: purchasePrice,
          gst_rate: settings?.gst_enabled ? settings.gst_percentage : 0,
          gst_amount: Math.round(itemGst * 100) / 100,
          discount: itemDiscount,
          profit_amount: Math.round(itemProfit * 100) / 100,
          total_amount: Math.round(itemTotal * 100) / 100,
          serial_numbers: item.serial_numbers ? JSON.stringify(item.serial_numbers) : null,
        })
        .select()
        .single()
      
      if (itemError) throw itemError
      billItems.push(billItem)
      
      // Prepare ledger entries (stock updates will be done after)
      if (product?.stock_tracking_type === 'serial' && item.serial_numbers && Array.isArray(item.serial_numbers)) {
        const currentStock = stockMap.get(item.product_id)
        const previousStock = currentStock?.quantity || 0
        ledgerEntries.push({
          tenant_id: branch.tenant_id,
          branch_id: body.branch_id,
          product_id: item.product_id,
          transaction_type: 'billing',
          quantity: -item.quantity,
          previous_stock: previousStock + item.quantity,
          current_stock: previousStock,
          reference_id: bill.id,
          reason: `Billing - Invoice ${invoiceNumber}`,
          created_by: user.id,
        })
      } else {
        const currentStock = stockMap.get(item.product_id)
        if (currentStock) {
          const newStock = currentStock.quantity - item.quantity
          ledgerEntries.push({
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
        }
      }
    }
    
    // Execute stock updates in parallel batches
    const stockUpdatePromises: Promise<any>[] = []
    for (const item of body.items) {
      const product = productsMap.get(item.product_id)
      
      if (product?.stock_tracking_type === 'serial' && item.serial_numbers && Array.isArray(item.serial_numbers)) {
        // Mark serial numbers as sold
        stockUpdatePromises.push(
          (async () => {
            await supabase
              .from('product_serial_numbers')
              .update({
                status: 'sold',
                bill_id: bill.id,
                sold_at: new Date().toISOString(),
              })
              .eq('product_id', item.product_id)
              .eq('branch_id', body.branch_id)
              .in('serial_number', item.serial_numbers)
            
            // Update current_stock count
            const { count } = await supabase
              .from('product_serial_numbers')
              .select('*', { count: 'exact', head: true })
              .eq('product_id', item.product_id)
              .eq('branch_id', body.branch_id)
              .eq('status', 'available')
            
            const newStockCount = count || 0
            const currentStock = stockMap.get(item.product_id)
            if (currentStock && 'id' in currentStock) {
              await supabase
                .from('current_stock')
                .update({ quantity: newStockCount })
                .eq('id', (currentStock as any).id)
            } else {
              await supabase
                .from('current_stock')
                .insert({
                  tenant_id: branch.tenant_id,
                  branch_id: body.branch_id,
                  product_id: item.product_id,
                  quantity: newStockCount,
                })
            }
          })()
        )
      } else {
        const currentStock = stockMap.get(item.product_id)
        if (currentStock && 'id' in currentStock) {
          const newStock = currentStock.quantity - item.quantity
          stockUpdatePromises.push(
            (async () => {
              await supabase
                .from('current_stock')
                .update({ quantity: newStock })
                .eq('id', (currentStock as any).id)
            })()
          )
        }
      }
    }
    
    // Execute all stock updates in parallel
    await Promise.all(stockUpdatePromises)
    
    // Insert all ledger entries in batch
    if (ledgerEntries.length > 0) {
      await supabase.from('stock_ledger').insert(ledgerEntries)
    }
    
    const duration = Date.now() - startTime
    console.log(`[PERF] POST /api/bills: ${duration}ms`)
    
    return NextResponse.json({ bill, items: billItems }, { 
      status: 201,
      headers: {
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[API] POST /api/bills error:', error)
    
    if (error.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    
    // Return more detailed error messages
    const errorMessage = error.message || error.error || 'Failed to create bill'
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: error.status || 500,
        headers: {
          'X-Response-Time': `${duration}ms`,
        }
      }
    )
  }
}

