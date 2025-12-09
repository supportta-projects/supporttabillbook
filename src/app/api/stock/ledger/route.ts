import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get stock ledger
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const productId = searchParams.get('product_id')
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
    
    let query = supabase
      .from('stock_ledger')
      .select(`
        *,
        product:products(*),
        created_by_user:users!stock_ledger_created_by_fkey(full_name, email)
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
    
    if (productId) {
      query = query.eq('product_id', productId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return NextResponse.json({ ledger: data })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock ledger' },
      { status: 500 }
    )
  }
}

