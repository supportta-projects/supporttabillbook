import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Fetch order with all details
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select(`
        *,
        branches:branch_id (
          id,
          name,
          code,
          address,
          phone
        ),
        tenants:tenant_id (
          id,
          name,
          code,
          email,
          phone,
          address
        ),
        created_by_user:created_by (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single()
    
    if (billError || !bill) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Check permissions
    if (user.role === 'branch_admin' || user.role === 'branch_staff') {
      if (user.branch_id !== bill.branch_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else if (user.role === 'tenant_owner') {
      if (user.tenant_id !== bill.tenant_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Fetch bill items
    const { data: items } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', id)
      .order('created_at', { ascending: true })
    
    // Fetch settings for company details
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('tenant_id', bill.tenant_id)
      .single()
    
    // Generate QR code data
    const qrData = {
      invoice: bill.invoice_number,
      amount: bill.total_amount,
      date: bill.created_at,
      gst: settings?.gst_number || '',
      tenant: bill.tenants?.name || '',
    }
    
    let qrCodeDataURL: string
    try {
      qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 100,
        margin: 1,
      })
    } catch (qrError) {
      console.error('[PDF] QR code generation error:', qrError)
      qrCodeDataURL = '' // Continue without QR code if generation fails
    }
    
    // Create PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin
    
    // Company Header (Left side)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(bill.tenants?.name || 'Company Name', margin, yPos)
    yPos += 8
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    if (bill.tenants?.address) {
      doc.text(bill.tenants.address, margin, yPos)
      yPos += 5
    }
    if (bill.tenants?.phone) {
      doc.text(`Phone: ${bill.tenants.phone}`, margin, yPos)
      yPos += 5
    }
    if (bill.tenants?.email) {
      doc.text(`Email: ${bill.tenants.email}`, margin, yPos)
      yPos += 5
    }
    if (settings?.gst_number) {
      doc.text(`GSTIN: ${settings.gst_number}`, margin, yPos)
      yPos += 5
    }
    
    // QR Code (Top Right)
    if (qrCodeDataURL) {
      doc.addImage(qrCodeDataURL, 'PNG', pageWidth - margin - 30, margin, 30, 30)
    }
    
    // Invoice Title (Center)
    yPos = margin + 10
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('TAX INVOICE', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15
    
    // Invoice Details (Right side)
    const invoiceDetailsX = pageWidth - margin - 60
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Invoice Number:', invoiceDetailsX, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(bill.invoice_number, invoiceDetailsX + 45, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Date:', invoiceDetailsX, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(bill.created_at).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }), invoiceDetailsX + 45, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Time:', invoiceDetailsX, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(bill.created_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    }), invoiceDetailsX + 45, yPos)
    yPos += 7
    
    if (bill.branches?.name) {
      doc.setFont('helvetica', 'bold')
      doc.text('Branch:', invoiceDetailsX, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(bill.branches.name, invoiceDetailsX + 45, yPos)
      yPos += 7
    }
    
    // Customer Details
    yPos += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Bill To:', margin, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(bill.customer_name || 'Walk-in Customer', margin, yPos)
    yPos += 5
    if (bill.customer_phone) {
      doc.text(`Phone: ${bill.customer_phone}`, margin, yPos)
      yPos += 5
    }
    
    // Items Table Header
    yPos += 10
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    
    const colWidths = [70, 15, 25, 20, 25, 30]
    const headers = ['Item', 'Qty', 'Price', 'GST%', 'Disc', 'Total']
    let xPos = margin
    
    headers.forEach((header, i) => {
      if (i === 0) {
        doc.text(header, xPos, yPos)
      } else {
        doc.text(header, xPos, yPos, { align: 'right' })
      }
      xPos += colWidths[i]
    })
    
    yPos += 5
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 7
    
    // Items Table Body
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    
    items?.forEach((item: any) => {
      // Check if we need a new page
      if (yPos > pageHeight - 50) {
        doc.addPage()
        yPos = margin
      }
      
      xPos = margin
      // Item name (truncate if too long)
      const itemName = item.product_name.length > 30 
        ? item.product_name.substring(0, 27) + '...' 
        : item.product_name
      doc.text(itemName, xPos, yPos)
      xPos += colWidths[0]
      
      // Quantity
      doc.text(item.quantity.toString(), xPos, yPos, { align: 'right' })
      xPos += colWidths[1]
      
      // Unit Price
      doc.text(`₹${Number(item.unit_price).toFixed(2)}`, xPos, yPos, { align: 'right' })
      xPos += colWidths[2]
      
      // GST Rate
      doc.text(`${item.gst_rate || 0}%`, xPos, yPos, { align: 'right' })
      xPos += colWidths[3]
      
      // Discount
      doc.text(`₹${Number(item.discount || 0).toFixed(2)}`, xPos, yPos, { align: 'right' })
      xPos += colWidths[4]
      
      // Total
      doc.setFont('helvetica', 'bold')
      doc.text(`₹${Number(item.total_amount).toFixed(2)}`, xPos, yPos, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      
      yPos += 7
    })
    
    // Summary Section
    yPos += 5
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 7
    
    const summaryX = pageWidth - margin - 60
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    doc.text('Subtotal:', summaryX, yPos)
    doc.text(`₹${Number(bill.subtotal || 0).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
    
    if (bill.discount > 0) {
      doc.text('Discount:', summaryX, yPos)
      doc.text(`-₹${Number(bill.discount).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 7
    }
    
    doc.text('GST Amount:', summaryX, yPos)
    doc.text(`₹${Number(bill.gst_amount || 0).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
    
    // Total Amount (Bold)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3)
    yPos += 5
    doc.text('Total Amount:', summaryX, yPos)
    doc.text(`₹${Number(bill.total_amount || 0).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
    
    // Payment Status
    if (bill.paid_amount !== undefined && bill.due_amount !== undefined) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const paidAmount = Number(bill.paid_amount || 0)
      const dueAmount = Number(bill.due_amount || 0)
      
      if (paidAmount > 0) {
        doc.text('Paid Amount:', summaryX, yPos)
        doc.setTextColor(0, 150, 0)
        doc.text(`₹${paidAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
        doc.setTextColor(60, 60, 60)
        yPos += 7
      }
      
      if (dueAmount > 0) {
        doc.text('Due Amount:', summaryX, yPos)
        doc.setTextColor(200, 0, 0)
        doc.text(`₹${dueAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
        doc.setTextColor(60, 60, 60)
        yPos += 7
      }
    }
    
    // Profit (if available)
    if (bill.profit_amount !== undefined && bill.profit_amount > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(128, 0, 128)
      doc.text('Profit:', summaryX, yPos)
      doc.text(`₹${Number(bill.profit_amount).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
      doc.setTextColor(60, 60, 60)
      yPos += 7
    }
    
    // Payment Mode
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Payment Mode: ${(bill.payment_mode || 'cash').toUpperCase()}`, margin, yPos)
    
    // Footer
    yPos = pageHeight - margin - 10
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, yPos, { align: 'center' })
    
    // Bank Details (if available)
    if (settings?.bank_account_number || settings?.upi_id) {
      yPos = pageHeight - margin - 30
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'bold')
      doc.text('Payment Details:', margin, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      
      if (settings.upi_id) {
        doc.text(`UPI ID: ${settings.upi_id}`, margin, yPos)
        yPos += 5
      }
      
      if (settings.bank_account_number) {
        doc.text(`Account: ${settings.bank_account_number}`, margin, yPos)
        yPos += 5
      }
      
      if (settings.bank_name) {
        doc.text(`Bank: ${settings.bank_name}`, margin, yPos)
        yPos += 5
      }
      
      if (settings.bank_ifsc_code) {
        doc.text(`IFSC: ${settings.bank_ifsc_code}`, margin, yPos)
      }
    }
    
    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${bill.invoice_number}.pdf"`,
      },
    })
  } catch (error: any) {
    // Handle Next.js redirect errors
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/orders/[id]/invoice/pdf error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

