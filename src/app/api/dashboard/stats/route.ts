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
    
    // Optimize: Build queries efficiently
    let billsQuery = supabase.from('bills').select('total_amount, created_at', { count: 'exact' })
    let expensesQuery = supabase.from('expenses').select('amount, expense_date, created_at', { count: 'exact' })
    let purchasesQuery = supabase.from('purchases').select('total_amount, created_at', { count: 'exact' })
    let stockQuery = supabase.from('current_stock').select('quantity, product_id')
    
    if (branchId) {
      billsQuery = billsQuery.eq('branch_id', branchId)
      expensesQuery = expensesQuery.eq('branch_id', branchId)
      purchasesQuery = purchasesQuery.eq('branch_id', branchId)
      stockQuery = stockQuery.eq('branch_id', branchId)
    } else if (tenantId && user.role === 'tenant_owner') {
      // Optimize: Get branch IDs first, then use in queries
      const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('tenant_id', tenantId)
      
      const branchIds = branches?.map(b => b.id) || []
      if (branchIds.length > 0) {
        billsQuery = billsQuery.in('branch_id', branchIds)
        expensesQuery = expensesQuery.in('branch_id', branchIds)
        purchasesQuery = purchasesQuery.in('branch_id', branchIds)
        // For stock, we need to filter by branch_ids
        stockQuery = stockQuery.in('branch_id', branchIds)
      } else {
        // No branches, return empty stats
        return NextResponse.json({
          sales: { total: 0, count: 0 },
          expenses: { total: 0, count: 0 },
          purchases: { total: 0, count: 0 },
          stock: { total_value: 0, total_products: 0, products_with_stock: 0, in_stock: 0, low_stock: 0, sold_out: 0 },
          profit: { total: 0, margin: 0 },
          period,
        }, {
          headers: { 'X-Response-Time': `${Date.now() - startTime}ms` }
        })
      }
    }
    
    // Apply date filters
    if (dateFilter) {
      billsQuery = billsQuery.gte('created_at', dateFilter)
      expensesQuery = expensesQuery.gte('expense_date', dateFilter)
      purchasesQuery = purchasesQuery.gte('created_at', dateFilter)
    }
    
    // Optimize: Fetch all data in parallel with limited fields
    const [billsResult, expensesResult, purchasesResult, stockResult, productsResult] = await Promise.all([
      billsQuery,
      expensesQuery,
      purchasesQuery,
      stockQuery,
      supabase.from('products').select('id, purchase_price, selling_price, min_stock').eq('tenant_id', tenantId).eq('is_active', true)
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
    
    // Calculate Stock Value (using purchase price or selling price as fallback)
    const stockValue = stockItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id)
      if (product) {
        const price = product.purchase_price || product.selling_price || 0
        return sum + (item.quantity * price)
      }
      return sum
    }, 0)
    
    // Calculate Stock Metrics
    const totalProducts = products.length
    const productsWithStock = stockItems.length
    const lowStockItems = stockItems.filter(item => {
      const product = products.find(p => p.id === item.product_id)
      return product && product.min_stock > 0 && item.quantity <= product.min_stock && item.quantity > 0
    }).length
    const soldOutItems = stockItems.filter(item => item.quantity === 0).length
    const inStockItems = stockItems.filter(item => item.quantity > 0).length
    
    // Calculate Profit (Sales - Expenses - Purchases)
    const profit = totalSales - totalExpenses - totalPurchases
    const profitMargin = totalSales > 0 ? ((profit / totalSales) * 100) : 0
    
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
        total: Math.round(profit * 100) / 100,
        margin: Math.round(profitMargin * 100) / 100,
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

