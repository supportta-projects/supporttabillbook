import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bill, BillItem } from '@/types'

export function useBills(branchId: string) {
  return useQuery({
    queryKey: ['bills', branchId],
    queryFn: async () => {
      const response = await fetch(`/api/bills?branch_id=${branchId}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch bills')
      }
      const data = await response.json()
      return data.bills as Bill[]
    },
    enabled: !!branchId,
  })
}

export function useBill(billId: string) {
  return useQuery({
    queryKey: ['bill', billId],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch bill')
      }
      const data = await response.json()
      return {
        bill: data.bill as Bill,
        items: data.items as BillItem[],
      }
    },
    enabled: !!billId,
  })
}

export function useCreateBill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (billData: {
      branch_id: string
      items: Array<{
        product_id: string
        product_name: string
        quantity: number
        unit_price: number
        gst_rate: number
        discount?: number
      }>
      customer_name?: string
      customer_phone?: string
      payment_mode?: 'cash' | 'card' | 'upi' | 'credit'
    }) => {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create bill')
      }

      const data = await response.json()
      return {
        bill: data.bill as Bill,
        items: data.items as BillItem[],
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bills', variables.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['stock', variables.branch_id] })
    },
  })
}

