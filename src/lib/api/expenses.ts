import { createClient } from '@/lib/supabase/server'
import { Expense } from '@/types'

/**
 * Create a new expense
 */
export async function createExpense(
  branchId: string,
  data: {
    category: string
    description: string
    amount: number
    payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer'
    expense_date?: string
    receipt_number?: string
    vendor_name?: string
    notes?: string
  }
): Promise<Expense> {
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

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      tenant_id: branch.tenant_id,
      branch_id: branchId,
      category: data.category,
      description: data.description,
      amount: data.amount,
      payment_mode: data.payment_mode,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      receipt_number: data.receipt_number,
      vendor_name: data.vendor_name,
      notes: data.notes,
      created_by: user.data.user.id,
    })
    .select()
    .single()

  if (error) throw error
  if (!expense) throw new Error('Failed to create expense')

  return expense as Expense
}

/**
 * Get expense details
 */
export async function getExpense(expenseId: string): Promise<Expense> {
  const supabase = await createClient()

  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single()

  if (error) throw error
  if (!expense) throw new Error('Expense not found')

  return expense as Expense
}

/**
 * List expenses for a branch
 */
export async function listExpenses(
  branchId: string,
  filters?: {
    startDate?: string
    endDate?: string
    category?: string
    paymentMode?: string
  }
): Promise<Expense[]> {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('branch_id', branchId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.startDate) {
    query = query.gte('expense_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('expense_date', filters.endDate)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.paymentMode) {
    query = query.eq('payment_mode', filters.paymentMode)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Expense[]
}

/**
 * Update an expense
 */
export async function updateExpense(
  expenseId: string,
  data: {
    category?: string
    description?: string
    amount?: number
    payment_mode?: 'cash' | 'card' | 'upi' | 'bank_transfer'
    expense_date?: string
    receipt_number?: string
    vendor_name?: string
    notes?: string
  }
): Promise<Expense> {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) throw new Error('Unauthorized')

  const { data: expense, error } = await supabase
    .from('expenses')
    .update(data)
    .eq('id', expenseId)
    .select()
    .single()

  if (error) throw error
  if (!expense) throw new Error('Failed to update expense')

  return expense as Expense
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  
  if (!user.data.user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) throw error
}

/**
 * Get expense summary by category
 */
export async function getExpenseSummary(
  branchId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select('category, amount')
    .eq('branch_id', branchId)

  if (startDate) {
    query = query.gte('expense_date', startDate)
  }
  if (endDate) {
    query = query.lte('expense_date', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  // Group by category
  const summary = (data || []).reduce((acc: Record<string, number>, expense) => {
    const category = expense.category
    acc[category] = (acc[category] || 0) + Number(expense.amount)
    return acc
  }, {})

  return summary
}

/**
 * Get total expenses for a period
 */
export async function getTotalExpenses(
  branchId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select('amount')
    .eq('branch_id', branchId)

  if (startDate) {
    query = query.gte('expense_date', startDate)
  }
  if (endDate) {
    query = query.lte('expense_date', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).reduce((sum, expense) => sum + Number(expense.amount), 0)
}

