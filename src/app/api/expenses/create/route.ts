import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()

    const { branch_id, ...expenseData } = body

    if (!branch_id) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 })
    }

    if (!expenseData.category || !expenseData.description || !expenseData.amount) {
      return NextResponse.json(
        { error: 'Category, description, and amount are required' },
        { status: 400 }
      )
    }

    // Check permissions
    if (user.role === 'branch_staff' && user.branch_id !== branch_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get branch to get tenant_id
    const { data: branch } = await supabase
      .from('branches')
      .select('tenant_id')
      .eq('id', branch_id)
      .single()

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }

    // Create expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: branch_id,
        category: expenseData.category,
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        payment_mode: expenseData.payment_mode,
        expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
        receipt_number: expenseData.receipt_number || null,
        vendor_name: expenseData.vendor_name || null,
        notes: expenseData.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    )
  }
}

