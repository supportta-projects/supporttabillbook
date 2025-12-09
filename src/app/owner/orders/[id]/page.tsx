'use client'

import { useParams, useRouter } from 'next/navigation'
import { useOrder } from '@/hooks/useOrders'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button-shadcn'
import { ArrowLeft, Receipt, Download, Building2, User, Phone, Calendar, DollarSign, FileText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const { data, isLoading, error } = useOrder(orderId)

  const handleDownloadInvoice = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate invoice')
      }
      
      const invoiceData = await response.json()
      
      // For now, open invoice in new window for printing
      // In production, you would generate PDF here
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice - ${invoiceData.invoice.invoice_number}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                .total { text-align: right; font-weight: bold; font-size: 18px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${invoiceData.invoice.tenant?.name || 'Shop'}</h1>
                <p>Invoice</p>
              </div>
              <div class="invoice-details">
                <div>
                  <p><strong>Invoice Number:</strong> ${invoiceData.invoice.invoice_number}</p>
                  <p><strong>Date:</strong> ${new Date(invoiceData.invoice.created_at).toLocaleDateString()}</p>
                  <p><strong>Branch:</strong> ${invoiceData.invoice.branch?.name || 'N/A'}</p>
                </div>
                <div>
                  ${invoiceData.invoice.customer_name ? `<p><strong>Customer:</strong> ${invoiceData.invoice.customer_name}</p>` : ''}
                  ${invoiceData.invoice.customer_phone ? `<p><strong>Phone:</strong> ${invoiceData.invoice.customer_phone}</p>` : ''}
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>GST</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.invoice.items.map((item: any) => `
                    <tr>
                      <td>${item.product_name}</td>
                      <td>${item.quantity}</td>
                      <td>₹${Number(item.unit_price).toLocaleString('en-IN')}</td>
                      <td>${item.gst_rate}%</td>
                      <td>₹${Number(item.total_amount).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">
                <p>Subtotal: ₹${Number(invoiceData.invoice.subtotal || 0).toLocaleString('en-IN')}</p>
                ${invoiceData.invoice.discount > 0 ? `<p>Discount: ₹${Number(invoiceData.invoice.discount).toLocaleString('en-IN')}</p>` : ''}
                <p>GST: ₹${Number(invoiceData.invoice.gst_amount || 0).toLocaleString('en-IN')}</p>
                <p><strong>Total: ₹${Number(invoiceData.invoice.total_amount || 0).toLocaleString('en-IN')}</strong></p>
                <p>Payment Mode: ${invoiceData.invoice.payment_mode?.toUpperCase() || 'CASH'}</p>
              </div>
              <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()">Print Invoice</button>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        toast.success('Invoice opened for printing')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate invoice')
    }
  }

  if (isLoading) {
    return (
      <PageContainer title="Order Details">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Loading order details...</div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (error || !data) {
    return (
      <PageContainer title="Order Details">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error?.message || 'Order not found'}</p>
            <Link href="/owner/orders">
              <Button className="mt-4">Back to Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const { order, items } = data

  return (
    <PageContainer
      title="Order Details"
      description={`Invoice: ${order.invoice_number}`}
    >
      <div className="max-w-4xl">
        <Link href="/owner/orders">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
        </Link>

        {/* Order Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  {order.invoice_number}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString('en-IN', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
              <Button onClick={handleDownloadInvoice} className="gap-2">
                <Download className="h-4 w-4" />
                Download Invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Branch</p>
                    <p className="font-semibold">{(order as any).branches?.name || 'N/A'}</p>
                  </div>
                </div>
                
                {(order as any).created_by_user && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Created By</p>
                      <p className="font-semibold">{(order as any).created_by_user.full_name}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {order.customer_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="font-semibold">{order.customer_name}</p>
                    </div>
                  </div>
                )}
                
                {order.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-semibold">{order.customer_phone}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Payment Mode</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      order.payment_mode === 'cash' 
                        ? 'bg-green-100 text-green-800'
                        : order.payment_mode === 'card'
                        ? 'bg-blue-100 text-blue-800'
                        : order.payment_mode === 'upi'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.payment_mode?.toUpperCase() || 'CASH'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Product</th>
                    <th className="text-right py-3 px-4 font-semibold">Quantity</th>
                    <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold">GST Rate</th>
                    <th className="text-right py-3 px-4 font-semibold">Discount</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, index: number) => (
                    <tr key={item.id || index} className="border-b">
                      <td className="py-3 px-4">{item.product_name}</td>
                      <td className="text-right py-3 px-4">{item.quantity}</td>
                      <td className="text-right py-3 px-4">₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                      <td className="text-right py-3 px-4">{item.gst_rate}%</td>
                      <td className="text-right py-3 px-4">₹{Number(item.discount || 0).toLocaleString('en-IN')}</td>
                      <td className="text-right py-3 px-4 font-semibold">₹{Number(item.total_amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold text-red-600">-₹{Number(order.discount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">GST:</span>
                <span className="font-semibold">₹{Number(order.gst_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-gray-200">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-lg font-bold text-green-600">
                  ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

