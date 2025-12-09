import { requireAuth } from '@/lib/auth/utils'
import { listExpenses } from '@/lib/api/expenses'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic'

const EXPENSE_CATEGORIES: Record<string, string> = {
  rent: 'Rent',
  utilities: 'Utilities',
  salaries: 'Salaries',
  marketing: 'Marketing',
  transport: 'Transport',
  maintenance: 'Maintenance',
  office_supplies: 'Office Supplies',
  food: 'Food',
  other: 'Other',
}

const PAYMENT_MODES: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
}

export default async function ExpensesList() {
  const user = await requireAuth()

  if (!user.branch_id) {
    redirect('/unauthorized')
  }

  const expenses = await listExpenses(user.branch_id)

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="mt-2 text-gray-600">Manage and track business expenses</p>
        </div>
        <Link
          href="/branch/expenses/create"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Add Expense
        </Link>
      </div>

      {/* Summary Card */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Expenses</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Total Records</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{expenses.length}</p>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Payment Mode
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No expenses found. Click &quot;Add Expense&quot; to create your first expense entry.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {new Date(expense.expense_date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-800">
                      {EXPENSE_CATEGORIES[expense.category] || expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={expense.description}>
                      {expense.description}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {expense.vendor_name || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {PAYMENT_MODES[expense.payment_mode] || expense.payment_mode}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

