'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useOrder } from '@/hooks/useOrders'
import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button-shadcn'
import { Input } from '@/components/ui/input-shadcn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowLeft, Receipt, Download, Building2, User, Phone, DollarSign, FileText, CreditCard, Loader2, Edit2, Save, X as XIcon } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const { data, isLoading, error, refetch } = useOrder(orderId)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ [key: string]: { unit_price: string; discount: string; quantity: string } }>({})
  const [isUpdatingItem, setIsUpdatingItem] = useState(false)

  const handleDownloadInvoice = async () => {
    try {
      // Show loading state
      toast.loading('Generating PDF invoice...', { id: 'pdf-download' })
      
      // Generate PDF via API
      const response = await fetch(`/api/orders/${orderId}/invoice/pdf`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }))
        throw new Error(errorData.error || 'Failed to generate PDF')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice-${data?.order.invoice_number || orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Invoice downloaded successfully', { id: 'pdf-download' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to download invoice', { id: 'pdf-download' })
    }
  }

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id)
    setEditValues({
      [item.id]: {
        unit_price: item.unit_price.toString(),
        discount: (item.discount || 0).toString(),
        quantity: item.quantity.toString(),
      }
    })
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditValues({})
  }

  const handleSaveItem = async (itemId: string) => {
    const values = editValues[itemId]
    if (!values) return

    const unitPrice = parseFloat(values.unit_price)
    const discount = parseFloat(values.discount) || 0
    const quantity = parseInt(values.quantity)

    if (isNaN(unitPrice) || unitPrice <= 0) {
      toast.error('Invalid unit price')
      return
    }

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Invalid quantity')
      return
    }

    setIsUpdatingItem(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_price: unitPrice,
          discount: discount,
          quantity: quantity,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update item')
      }

      toast.success('Item updated successfully')
      setEditingItemId(null)
      setEditValues({})
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item')
    } finally {
      setIsUpdatingItem(false)
    }
  }

  const handleCollectPayment = async () => {
    if (!data?.order) return
    
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    const order = data.order as any
    const currentPaid = order.paid_amount || 0
    const totalAmount = order.total_amount
    const newPaid = currentPaid + amount
    
    if (newPaid > totalAmount) {
      toast.error(`Payment amount exceeds total. Maximum: ₹${(totalAmount - currentPaid).toLocaleString('en-IN')}`)
      return
    }
    
    setIsProcessingPayment(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_mode: paymentMode,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to record payment')
      }
      
      toast.success('Payment recorded successfully')
      setShowPaymentDialog(false)
      setPaymentAmount('')
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  if (isLoading) {
    return (
      <PageContainer title="Order Details">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
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
  const orderWithExtras = order as any
  const paidAmount = orderWithExtras.paid_amount || 0
  const totalAmount = order.total_amount || 0
  const dueAmount = totalAmount - paidAmount
  const isFullyPaid = dueAmount <= 0

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
              <div className="flex gap-2">
                <Button onClick={handleDownloadInvoice} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                {!isFullyPaid && (
                  <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Collect Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Collect Payment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Amount</label>
                          <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={`Max: ₹${dueAmount.toLocaleString('en-IN')}`}
                            max={dueAmount}
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Due Amount: ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Payment Mode</label>
                          <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={handleCollectPayment}
                          disabled={isProcessingPayment || !paymentAmount}
                          className="w-full"
                        >
                          {isProcessingPayment ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Record Payment'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Branch</p>
                    <p className="font-semibold">{orderWithExtras.branches?.name || 'N/A'}</p>
                  </div>
                </div>
                
                {orderWithExtras.created_by_user && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Created By</p>
                      <p className="font-semibold">{orderWithExtras.created_by_user.full_name}</p>
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
            
            {/* Payment Status */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid Amount</p>
                  <p className="text-lg font-bold text-green-600">₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Due Amount</p>
                  <p className={`text-lg font-bold ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
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
                    <th className="text-center py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, index: number) => {
                    const isEditing = editingItemId === item.id
                    const editValue = editValues[item.id] || {
                      unit_price: item.unit_price.toString(),
                      discount: (item.discount || 0).toString(),
                      quantity: item.quantity.toString(),
                    }
                    
                    return (
                      <tr key={item.id || index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{item.product_name}</td>
                        <td className="text-right py-3 px-4">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValue.quantity}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                [item.id]: { ...editValue, quantity: e.target.value }
                              })}
                              className="w-20 text-right h-8 text-sm"
                              min="1"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="text-right py-3 px-4">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValue.unit_price}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                [item.id]: { ...editValue, unit_price: e.target.value }
                              })}
                              className="w-24 text-right h-8 text-sm"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            `₹${Number(item.unit_price).toLocaleString('en-IN')}`
                          )}
                        </td>
                        <td className="text-right py-3 px-4">{item.gst_rate}%</td>
                        <td className="text-right py-3 px-4">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValue.discount}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                [item.id]: { ...editValue, discount: e.target.value }
                              })}
                              className="w-24 text-right h-8 text-sm"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            `₹${Number(item.discount || 0).toLocaleString('en-IN')}`
                          )}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold">₹{Number(item.total_amount).toLocaleString('en-IN')}</td>
                        <td className="text-center py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveItem(item.id)}
                                disabled={isUpdatingItem}
                                className="h-7 w-7 p-0"
                              >
                                {isUpdatingItem ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={isUpdatingItem}
                                className="h-7 w-7 p-0"
                              >
                                <XIcon className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditItem(item)}
                              className="h-7 w-7 p-0"
                              title="Edit Item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
              {orderWithExtras.profit_amount !== undefined && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-purple-600">Profit:</span>
                  <span className="text-sm font-bold text-purple-600">
                    ₹{Number(orderWithExtras.profit_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
