import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get bill details with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single()
    
    if (billError) throw billError
    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (user.branch_id !== bill.branch_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    const { data: items, error: itemsError } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', id)
    
    if (itemsError) throw itemsError
    
    return NextResponse.json({ bill, items })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bill' },
      { status: 500 }
    )
  }
}

