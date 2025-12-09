import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get current stock (tenant owner sees all branches, branch users see their branch)
export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const tenantId = searchParams.get('tenant_id')
    const supabase = await createClient()
    
    let targetBranchIds: string[] = []
    let targetTenantId: string | null = null
    
    // Tenant owners can see all branches' stock
    if (user.role === 'tenant_owner') {
      const finalTenantId = tenantId || user.tenant_id
      if (finalTenantId) {
        targetTenantId = finalTenantId
        // Get all branches for this tenant
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', finalTenantId)
          .eq('is_active', true)
        
        if (branchId) {
          // Filter by specific branch if provided
          targetBranchIds = [branchId]
        } else {
          // Show all branches
          targetBranchIds = branches?.map(b => b.id) || []
        }
      }
    }
    // Branch users see only their branch
    else if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (!user.branch_id) {
        return NextResponse.json(
          { error: 'No branch assigned' },
          { status: 400 }
        )
      }
      targetBranchIds = [user.branch_id]
    } else {
      // Require branch_id for other roles
      if (!branchId) {
        return NextResponse.json(
          { error: 'branch_id is required' },
          { status: 400 }
        )
      }
      targetBranchIds = [branchId]
    }
    
    if (targetBranchIds.length === 0) {
      return NextResponse.json({ stock: [] })
    }
    
    // Get tenant_id from first branch if not provided
    if (!targetTenantId) {
      const { data: branch } = await supabase
        .from('branches')
        .select('tenant_id')
        .eq('id', targetBranchIds[0])
        .single()
      
      if (!branch) {
        return NextResponse.json(
          { error: 'Branch not found' },
          { status: 404 }
        )
      }
      targetTenantId = branch.tenant_id
    }
    
    // Get all products for this tenant
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', targetTenantId)
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    // Get current stock for all target branches
    const { data: currentStock } = await supabase
      .from('current_stock')
      .select('*, branches:branch_id(id, name, code)')
      .in('branch_id', targetBranchIds)
    
    // Get branch names mapping
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, name, code')
      .in('id', targetBranchIds)
    
    const branchMap = new Map(branchData?.map(b => [b.id, b]) || [])
    
    // Get sold out details from stock ledger (billing transactions)
    // First get ledger entries with billing type
    const { data: billingLedgerEntries } = await supabase
      .from('stock_ledger')
      .select('id, product_id, quantity, created_at, reference_id, branch_id')
      .in('branch_id', targetBranchIds)
      .eq('transaction_type', 'billing')
      .order('created_at', { ascending: false })
      .limit(200) // Last 200 sales across all branches
    
    // Then get bills for these entries
    const billIds = billingLedgerEntries?.map(e => e.reference_id).filter(Boolean) || []
    const { data: bills } = billIds.length > 0 ? await supabase
      .from('bills')
      .select('id, invoice_number, created_at, customer_name')
      .in('id', billIds)
      : { data: [] }
    
    // Combine ledger entries with bill data
    const soldOutDetails = billingLedgerEntries?.map(entry => {
      const bill = bills?.find(b => b.id === entry.reference_id)
      return {
        ...entry,
        bill: bill || null,
      }
    }) || []
    
    // Combine products with stock data across all branches
    const stockWithProducts: any[] = []
    
    products?.forEach(product => {
      // Get stock for this product across all branches
      const productStock = currentStock?.filter(s => s.product_id === product.id) || []
      
      // If multiple branches, create entry for each branch
      if (targetBranchIds.length > 1) {
        targetBranchIds.forEach(branchId => {
          const stock = productStock.find(s => s.branch_id === branchId)
          const branch = branchMap.get(branchId)
          const quantity = stock?.quantity || 0
          
          // Get sold out details for this product in this branch
          const productSales = soldOutDetails?.filter(
            entry => entry.product_id === product.id && entry.branch_id === branchId
          ) || []
          
          stockWithProducts.push({
            id: stock?.id || null,
            product_id: product.id,
            product_name: product.name,
            product_code: product.sku,
            branch_id: branchId,
            branch_name: branch?.name || 'N/A',
            quantity: quantity,
            purchase_price: product.purchase_price || 0,
            selling_price: product.selling_price || 0,
            min_stock: product.min_stock || 0,
            updated_at: stock?.updated_at || product.created_at,
          })
        })
      } else {
        // Single branch - simpler structure
        const stock = productStock[0]
        const quantity = stock?.quantity || 0
        const branchId = targetBranchIds[0]
        const branch = branchMap.get(branchId)
        
        // Get sold out details for this product
        const productSales = soldOutDetails?.filter(
          entry => entry.product_id === product.id && entry.branch_id === branchId
        ) || []
        
        stockWithProducts.push({
          id: stock?.id || null,
          product_id: product.id,
          product_name: product.name,
          product_code: product.sku,
          branch_id: branchId,
          branch_name: branch?.name || 'N/A',
          quantity: quantity,
          purchase_price: product.purchase_price || 0,
          selling_price: product.selling_price || 0,
          min_stock: product.min_stock || 0,
          updated_at: stock?.updated_at || product.created_at,
        })
      }
    })
    
    const duration = Date.now() - startTime
    if (duration > 10) {
      console.warn(`[PERF] GET /api/stock: ${duration}ms (target: <10ms)`)
    }
    
    return NextResponse.json({ stock: stockWithProducts }, {
      headers: {
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
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
    console.error('[API] GET /api/stock error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock' },
      { status: 500 }
    )
  }
}

