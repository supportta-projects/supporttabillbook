'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities (Electricity, Water, etc.)' },
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'transport', label: 'Transport & Fuel' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'food', label: 'Food & Beverages' },
  { value: 'other', label: 'Other' },
] as const

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const

export default function CreateExpense() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    category: 'other',
    description: '',
    amount: '',
    payment_mode: 'cash' as 'cash' | 'card' | 'upi' | 'bank_transfer',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_number: '',
    vendor_name: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Get current user to get branch_id
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Unauthorized')
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', authUser.id)
        .single()

      if (!userProfile?.branch_id) {
        throw new Error('Branch not found')
      }

      // Create expense via API route
      const response = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: userProfile.branch_id,
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create expense')
      }

      // Redirect to expenses list
      router.push('/branch/expenses')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/branch/expenses"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          ← Back to Expenses
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Add Expense</h1>
        <p className="mt-2 text-gray-600">Record a new business expense</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-lg bg-white p-6 shadow">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Expense Date */}
            <div>
              <label htmlFor="expense_date" className="block text-sm font-medium text-gray-700">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="expense_date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                placeholder="0.00"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label htmlFor="payment_mode" className="block text-sm font-medium text-gray-700">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                id="payment_mode"
                required
                value={formData.payment_mode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_mode: e.target.value as 'cash' | 'card' | 'upi' | 'bank_transfer',
                  })
                }
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Name */}
            <div>
              <label htmlFor="vendor_name" className="block text-sm font-medium text-gray-700">
                Vendor Name
              </label>
              <input
                type="text"
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                placeholder="Optional"
              />
            </div>

            {/* Receipt Number */}
            <div>
              <label htmlFor="receipt_number" className="block text-sm font-medium text-gray-700">
                Receipt Number
              </label>
              <input
                type="text"
                id="receipt_number"
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
              placeholder="Enter expense description..."
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
              placeholder="Additional notes (optional)"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/branch/expenses"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

