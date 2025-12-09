import { requireAuth } from '@/lib/auth/utils'
import { getBillDetails } from '@/lib/api/billing'
import PrintButtons from './PrintButtons'

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic'

export default async function BillPrint({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  await requireAuth()
  const { id } = await params

  let billData = null
  let error = null

  try {
    billData = await getBillDetails(id)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load bill'
  }

  if (error || !billData) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-red-600">Error</h1>
        <p className="mt-4 text-gray-600">{error || 'Bill not found'}</p>
      </div>
    )
  }

  const { bill, items } = billData

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Invoice</h1>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600">Invoice Number</p>
          <p className="text-lg font-semibold">{bill.invoice_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p>{new Date(bill.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Mode</p>
            <p className="capitalize">{bill.payment_mode}</p>
          </div>
        </div>

        {bill.customer_name && (
          <div className="mb-6">
            <p className="text-sm text-gray-600">Customer</p>
            <p className="font-semibold">{bill.customer_name}</p>
            {bill.customer_phone && <p className="text-sm">{bill.customer_phone}</p>}
          </div>
        )}

        <div className="border-t border-b py-4 mb-6">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-2">Item</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.product_name}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2 text-right">{item.unit_price.toFixed(2)}</td>
                  <td className="py-2 text-right">{item.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right space-y-2">
          <div className="flex justify-end gap-4">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-semibold">₹{bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-end gap-4">
              <span className="text-gray-600">Discount:</span>
              <span>₹{bill.discount.toFixed(2)}</span>
            </div>
          )}
          {bill.gst_amount > 0 && (
            <div className="flex justify-end gap-4">
              <span className="text-gray-600">GST:</span>
              <span>₹{bill.gst_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-end gap-4 text-xl font-bold border-t pt-2">
            <span>Total:</span>
            <span>₹{bill.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <PrintButtons />
      </div>
    </div>
  )
}

