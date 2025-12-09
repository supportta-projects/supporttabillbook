import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get expense details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (user.branch_id !== expense.branch_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json({ expense })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expense' },
      { status: 500 }
    )
  }
}

// PUT - Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Get existing expense to check permissions
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('branch_id')
      .eq('id', id)
      .single()
    
    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'branch_staff' && user.branch_id !== existingExpense.branch_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Build update object
    const updates: any = {}
    if (body.category !== undefined) updates.category = body.category
    if (body.description !== undefined) updates.description = body.description
    if (body.amount !== undefined) updates.amount = parseFloat(body.amount)
    if (body.payment_mode !== undefined) updates.payment_mode = body.payment_mode
    if (body.expense_date !== undefined) updates.expense_date = body.expense_date
    if (body.receipt_number !== undefined) updates.receipt_number = body.receipt_number || null
    if (body.vendor_name !== undefined) updates.vendor_name = body.vendor_name || null
    if (body.notes !== undefined) updates.notes = body.notes || null
    
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return NextResponse.json({ expense: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get existing expense to check permissions
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('branch_id')
      .eq('id', id)
      .single()
    
    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }
    
    // Check permissions - only branch admins can delete
    if (user.role !== 'branch_admin' && user.role !== 'tenant_owner' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    if (user.role === 'branch_admin' && user.branch_id !== existingExpense.branch_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    )
  }
}

