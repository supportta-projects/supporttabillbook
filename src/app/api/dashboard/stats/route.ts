import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const tenantId = searchParams.get('tenant_id') || user.tenant_id
    const period = searchParams.get('period') || 'today' // today, month, all
    
    const supabase = await createClient()
    
    // Date filters
    const now = new Date()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    let dateFilter = ''
    if (period === 'today') {
      dateFilter = todayStart.toISOString()
    } else if (period === 'month') {
      dateFilter = monthStart.toISOString()
    }
    
    // Get branch IDs for filtering
    let branchIds: string[] = []
    if (branchId) {
      branchIds = [branchId]
    } else if (tenantId && user.role === 'tenant_owner') {
      const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('tenant_id', tenantId)
      branchIds = branches?.map(b => b.id) || []
      
      if (branchIds.length === 0) {
        // No branches, return empty stats
        return NextResponse.json({
          sales: { total: 0, count: 0 },
          expenses: { total: 0, count: 0 },
          purchases: { total: 0, count: 0 },
          stock: { total_value: 0, total_products: 0, products_with_stock: 0, in_stock: 0, low_stock: 0, sold_out: 0 },
          profit: { total: 0, margin: 0, from_sales: 0 },
          period,
        }, {
          headers: { 'X-Response-Time': `${Date.now() - startTime}ms` }
        })
      }
    }
    
    // Optimize: Build queries efficiently
    let billsQuery = supabase.from('bills').select('total_amount, profit_amount, created_at', { count: 'exact' })
    let expensesQuery = supabase.from('expenses').select('amount, expense_date, created_at', { count: 'exact' })
    let purchasesQuery = supabase.from('purchases').select('total_amount, created_at', { count: 'exact' })
    let stockQuery = supabase.from('current_stock').select('quantity, product_id')
    
    if (branchIds.length > 0) {
      billsQuery = billsQuery.in('branch_id', branchIds)
      expensesQuery = expensesQuery.in('branch_id', branchIds)
      purchasesQuery = purchasesQuery.in('branch_id', branchIds)
      stockQuery = stockQuery.in('branch_id', branchIds)
    }
    
    // Apply date filters
    if (dateFilter) {
      billsQuery = billsQuery.gte('created_at', dateFilter)
      expensesQuery = expensesQuery.gte('expense_date', dateFilter)
      purchasesQuery = purchasesQuery.gte('created_at', dateFilter)
    }
    
    // Optimize: Fetch all data in parallel with limited fields
    // IMPORTANT: Only fetch active products for total products count
    const [billsResult, expensesResult, purchasesResult, stockResult, productsResult] = await Promise.all([
      billsQuery,
      expensesQuery,
      purchasesQuery,
      stockQuery,
      supabase
        .from('products')
        .select('id, purchase_price, selling_price, min_stock')
        .eq('tenant_id', tenantId)
        .eq('is_active', true) // Only count active products
    ])
    
    const bills = billsResult.data || []
    const expenses = expensesResult.data || []
    const purchases = purchasesResult.data || []
    const stockItems = stockResult.data || []
    const products = productsResult.data || []
    
    // Calculate Sales
    const totalSales = bills.reduce((sum, bill) => sum + Number(bill.total_amount), 0)
    const totalBills = bills.length
    
    // Calculate Expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
    
    // Calculate Purchases
    const totalPurchases = purchases.reduce((sum, pur) => sum + Number(pur.total_amount), 0)
    
    // Filter stock items to only include active products
    // Create a set of active product IDs for fast lookup
    const activeProductIds = new Set(products.map(p => p.id))
    const activeStockItems = stockItems.filter(item => activeProductIds.has(item.product_id))
    
    // Calculate Stock Value (using purchase price or selling price as fallback)
    // Only count stock for active products
    const stockValue = activeStockItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id)
      if (product) {
        const price = product.purchase_price || product.selling_price || 0
        return sum + (item.quantity * price)
      }
      return sum
    }, 0)
    
    // Calculate Stock Metrics - Only for active products
    const totalProducts = products.length // Already filtered to active products only
    const productsWithStock = activeStockItems.length // Only active products with stock
    const lowStockItems = activeStockItems.filter(item => {
      const product = products.find(p => p.id === item.product_id)
      return product && product.min_stock > 0 && item.quantity <= product.min_stock && item.quantity > 0
    }).length
    const soldOutItems = activeStockItems.filter(item => item.quantity === 0).length
    const inStockItems = activeStockItems.filter(item => item.quantity > 0).length
    
    // Calculate Profit from bills (sum of profit_amount from bills query)
    const billsProfit = bills.reduce((sum: number, bill: any) => sum + Number(bill.profit_amount || 0), 0)
    
    // Calculate Net Profit (Bills Profit - Expenses - Purchases)
    const netProfit = billsProfit - totalExpenses - totalPurchases
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100) : 0
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/dashboard/stats: ${duration}ms`)
    
    return NextResponse.json({
      sales: {
        total: Math.round(totalSales * 100) / 100,
        count: totalBills,
      },
      expenses: {
        total: Math.round(totalExpenses * 100) / 100,
        count: expenses.length,
      },
      purchases: {
        total: Math.round(totalPurchases * 100) / 100,
        count: purchases.length,
      },
      stock: {
        total_value: Math.round(stockValue * 100) / 100,
        total_products: totalProducts,
        products_with_stock: productsWithStock,
        in_stock: inStockItems,
        low_stock: lowStockItems,
        sold_out: soldOutItems,
      },
      profit: {
        total: Math.round(netProfit * 100) / 100,
        margin: Math.round(profitMargin * 100) / 100,
        from_sales: Math.round(billsProfit * 100) / 100,
      },
      period,
    }, {
      headers: {
        'X-Response-Time': `${duration}ms`
      }
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

