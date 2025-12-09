import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Expense } from '@/types'

export function useExpenses(branchId: string, filters?: {
  start_date?: string
  end_date?: string
  category?: string
}) {
  return useQuery({
    queryKey: ['expenses', branchId, filters],
    queryFn: async () => {
      let url = `/api/expenses?branch_id=${branchId}`
      if (filters?.start_date) url += `&start_date=${filters.start_date}`
      if (filters?.end_date) url += `&end_date=${filters.end_date}`
      if (filters?.category) url += `&category=${filters.category}`
      
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch expenses')
      }
      const data = await response.json()
      return data.expenses as Expense[]
    },
    enabled: !!branchId,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expenseData: {
      branch_id: string
      category: string
      description: string
      amount: number
      payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer'
      expense_date?: string
      receipt_number?: string
      vendor_name?: string
      notes?: string
    }) => {
      const response = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create expense')
      }

      const data = await response.json()
      return data.expense as Expense
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.branch_id] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update expense')
      }

      const data = await response.json()
      return data.expense as Expense
    },
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', expense.branch_id] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, branch_id }: { id: string; branch_id: string }) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete expense')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.branch_id] })
    },
  })
}

