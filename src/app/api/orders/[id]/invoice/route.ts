import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Generate invoice PDF/download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select(`
        *,
        branches:branch_id (
          id,
          name,
          code,
          address,
          phone,
          tenant_id
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
    
    if (billError) throw billError
    if (!bill) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
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
    
    const { data: items, error: itemsError } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', id)
      .order('created_at', { ascending: true })
    
    if (itemsError) throw itemsError
    
    // For now, return JSON with invoice data
    // In production, you would generate PDF here using a library like pdfkit or jsPDF
    // For now, we'll return structured data that can be used to generate PDF on client side
    
    return NextResponse.json({
      invoice: {
        ...bill,
        branch: bill.branches,
        tenant: bill.tenants,
        created_by: bill.created_by_user,
        items: items || [],
      },
      // Include download URL for future PDF generation
      downloadUrl: `/api/orders/${id}/invoice/pdf`,
    })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/orders/[id]/invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}

