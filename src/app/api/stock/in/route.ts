import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// POST - Add stock (stock in)
export async function POST(request: Request) {
  const startTime = Date.now()
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
    
    // Optimize: Get branch and current stock in parallel
    const [branchResult, currentStockResult] = await Promise.all([
      supabase
        .from('branches')
        .select('tenant_id')
        .eq('id', body.branch_id)
        .single(),
      supabase
        .from('current_stock')
        .select('*')
        .eq('branch_id', body.branch_id)
        .eq('product_id', body.product_id)
        .single()
    ])
    
    const branch = branchResult.data
    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }
    
    const currentStock = currentStockResult.data
    const previousStock = currentStock?.quantity || 0
    const newStock = previousStock + parseInt(body.quantity)
    
    // Optimize: Use upsert for current_stock and insert ledger in parallel
    const [ledgerResult, stockResult] = await Promise.all([
      supabase
        .from('stock_ledger')
        .insert({
          tenant_id: branch.tenant_id,
          branch_id: body.branch_id,
          product_id: body.product_id,
          transaction_type: 'stock_in',
          quantity: parseInt(body.quantity),
          previous_stock: previousStock,
          current_stock: newStock,
          reference_id: body.reference_id || null,
          reason: body.reason || null,
          created_by: user.id,
        })
        .select()
        .single(),
      currentStock
        ? supabase
            .from('current_stock')
            .update({ quantity: newStock })
            .eq('id', currentStock.id)
        : supabase
            .from('current_stock')
            .insert({
              tenant_id: branch.tenant_id,
              branch_id: body.branch_id,
              product_id: body.product_id,
              quantity: newStock,
            })
    ])
    
    if (ledgerResult.error) throw ledgerResult.error
    if (stockResult.error) throw stockResult.error
    
    // Auto-active logic: If stock was 0 and now has stock, activate product
    // Only activate if product was previously inactive (don't override manual deactivation)
    if (previousStock === 0 && newStock > 0) {
      // Check if product is currently inactive
      const { data: product } = await supabase
        .from('products')
        .select('is_active')
        .eq('id', body.product_id)
        .single()
      
      // Only auto-activate if product is inactive (likely due to zero stock)
      // This prevents overriding manual deactivation
      if (product && !product.is_active) {
        await supabase
          .from('products')
          .update({ is_active: true })
          .eq('id', body.product_id)
          .eq('tenant_id', branch.tenant_id)
      }
    }
    
    const duration = Date.now() - startTime
    if (duration > 10) {
      console.warn(`[PERF] POST /api/stock/in took ${duration}ms (target: <10ms)`)
    }
    
    return NextResponse.json(
      { ledgerEntry: ledgerResult.data },
      { 
        status: 201,
        headers: {
          'X-Response-Time': `${duration}ms`
        }
      }
    )
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const duration = Date.now() - startTime
    console.error(`[PERF] POST /api/stock/in error after ${duration}ms:`, error)
    return NextResponse.json(
      { error: error.message || 'Failed to add stock' },
      { status: 500 }
    )
  }
}

