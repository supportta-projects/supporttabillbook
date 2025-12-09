'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useOrder } from '@/hooks/useOrders'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button-shadcn'
import { ArrowLeft, Download, Printer, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const { data, isLoading } = useOrder(orderId)

  // Auto-redirect to order details immediately (invoice page should not be accessed directly)
  useEffect(() => {
    router.push(`/owner/orders/${orderId}`)
  }, [orderId, router])

  // Build invoice data from order data directly - no separate API call needed
  const invoiceData = useMemo(() => {
    if (!data) return null
    
    const { order, items } = data
    
    return {
      ...order,
      items: items || [],
      tenant: (order as any).tenants,
      branch: (order as any).branches,
      created_by: (order as any).created_by_user,
    }
  }, [data])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Generate printable HTML
    if (!invoiceData) return
    
    const printContent = generateInvoiceHTML(invoiceData)
    const blob = new Blob([printContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Invoice-${invoiceData.invoice_number}-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateInvoiceHTML = (invoice: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice.invoice_number}</title>
          <style>
            @media print {
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-section h3 {
              margin-top: 0;
              font-size: 16px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            .summary {
              margin-top: 20px;
              margin-left: auto;
              width: 300px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            .summary-total {
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
              font-size: 18px;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${invoice.tenant?.name || 'Shop'}</h1>
            <p style="margin: 5px 0;">${invoice.tenant?.address || ''}</p>
            <p style="margin: 5px 0;">${invoice.tenant?.phone || ''} | ${invoice.tenant?.email || ''}</p>
            <h2 style="margin-top: 20px;">TAX INVOICE</h2>
          </div>
          
          <div class="invoice-info">
            <div class="info-section">
              <h3>Invoice Details</h3>
              <p><strong>Invoice No:</strong> ${invoice.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p><strong>Time:</strong> ${new Date(invoice.created_at).toLocaleTimeString('en-IN')}</p>
              <p><strong>Branch:</strong> ${invoice.branch?.name || 'N/A'} (${invoice.branch?.code || ''})</p>
            </div>
            <div class="info-section">
              <h3>Customer Details</h3>
              ${invoice.customer_name ? `<p><strong>Name:</strong> ${invoice.customer_name}</p>` : '<p><strong>Name:</strong> Walk-in Customer</p>'}
              ${invoice.customer_phone ? `<p><strong>Phone:</strong> ${invoice.customer_phone}</p>` : ''}
              <p><strong>Payment Mode:</strong> ${invoice.payment_mode?.toUpperCase() || 'CASH'}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">GST %</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.product_name}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">₹${Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">${item.gst_rate}%</td>
                  <td class="text-right">₹${Number(item.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">₹${Number(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>₹${Number(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            ${invoice.discount > 0 ? `
              <div class="summary-row">
                <span>Discount:</span>
                <span>-₹${Number(invoice.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            <div class="summary-row">
              <span>GST Amount:</span>
              <span>₹${Number(invoice.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row summary-total">
              <span>Total Amount:</span>
              <span>₹${Number(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            ${invoice.profit_amount !== undefined && invoice.profit_amount > 0 ? `
              <div class="summary-row" style="color: #9333ea; font-weight: 600;">
                <span>Profit:</span>
                <span>₹${Number(invoice.profit_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
          </div>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
              Print Invoice
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Close
            </button>
          </div>
        </body>
      </html>
    `
  }

  if (isLoading || !invoiceData) {
    return (
      <PageContainer title="Invoice">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <div className="text-gray-500">Loading invoice...</div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="no-print mb-4 flex justify-between items-center">
        <Link href={`/owner/orders/${orderId}`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Order
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Invoice Content - Printable */}
      <Card className="print:shadow-none">
        <CardContent className="p-8">
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
            <h1 className="text-3xl font-bold mb-2">{invoiceData.tenant?.name || 'Shop'}</h1>
            <p className="text-sm text-gray-600">{invoiceData.tenant?.address || ''}</p>
            <p className="text-sm text-gray-600">
              {invoiceData.tenant?.phone || ''} {invoiceData.tenant?.email ? `| ${invoiceData.tenant.email}` : ''}
            </p>
            <h2 className="text-xl font-semibold mt-4">TAX INVOICE</h2>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold border-b pb-2 mb-2">Invoice Details</h3>
              <p className="text-sm"><strong>Invoice No:</strong> {invoiceData.invoice_number}</p>
              <p className="text-sm"><strong>Date:</strong> {new Date(invoiceData.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p className="text-sm"><strong>Time:</strong> {new Date(invoiceData.created_at).toLocaleTimeString('en-IN')}</p>
              <p className="text-sm"><strong>Branch:</strong> {invoiceData.branch?.name || 'N/A'} ({invoiceData.branch?.code || ''})</p>
            </div>
            <div>
              <h3 className="font-semibold border-b pb-2 mb-2">Customer Details</h3>
              <p className="text-sm"><strong>Name:</strong> {invoiceData.customer_name || 'Walk-in Customer'}</p>
              {invoiceData.customer_phone && (
                <p className="text-sm"><strong>Phone:</strong> {invoiceData.customer_phone}</p>
              )}
              <p className="text-sm"><strong>Payment Mode:</strong> {invoiceData.payment_mode?.toUpperCase() || 'CASH'}</p>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-3 font-semibold">#</th>
                <th className="text-left py-3 font-semibold">Product Name</th>
                <th className="text-right py-3 font-semibold">Qty</th>
                <th className="text-right py-3 font-semibold">Unit Price</th>
                <th className="text-right py-3 font-semibold">GST %</th>
                <th className="text-right py-3 font-semibold">Discount</th>
                <th className="text-right py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item: any, index: number) => (
                <tr key={item.id || index} className="border-b">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">{item.product_name}</td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-2">{item.gst_rate}%</td>
                  <td className="text-right py-2">₹{Number(item.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-2 font-semibold">₹{Number(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto w-80">
            <div className="flex justify-between py-2">
              <span>Subtotal:</span>
              <span>₹{Number(invoiceData.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {invoiceData.discount > 0 && (
              <div className="flex justify-between py-2">
                <span>Discount:</span>
                <span>-₹{Number(invoiceData.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span>GST Amount:</span>
              <span>₹{Number(invoiceData.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 pt-4 border-t-2 border-gray-800 text-lg font-bold">
              <span>Total Amount:</span>
              <span>₹{Number(invoiceData.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {invoiceData.profit_amount !== undefined && invoiceData.profit_amount > 0 && (
              <div className="flex justify-between py-2 pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-purple-600">Profit:</span>
                <span className="text-sm font-bold text-purple-600">
                  ₹{Number(invoiceData.profit_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div className="text-center mt-12 text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-2">Generated on {new Date().toLocaleString('en-IN')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

