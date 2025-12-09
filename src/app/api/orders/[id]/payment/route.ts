import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Validate input
    const paymentAmount = parseFloat(body.amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      )
    }
    
    // Fetch bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
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
    
    const currentPaid = parseFloat(bill.paid_amount || 0)
    const totalAmount = parseFloat(bill.total_amount)
    const newPaid = currentPaid + paymentAmount
    const newDue = totalAmount - newPaid
    
    if (newPaid > totalAmount) {
      return NextResponse.json(
        { error: `Payment amount exceeds total. Maximum: ₹${(totalAmount - currentPaid).toLocaleString('en-IN')}` },
        { status: 400 }
      )
    }
    
    // Create payment transaction
    const { error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        bill_id: id,
        tenant_id: bill.tenant_id,
        branch_id: bill.branch_id,
        amount: paymentAmount,
        payment_mode: body.payment_mode || 'cash',
        notes: body.notes || null,
        created_by: user.id,
      })
    
    if (txError) {
      console.error('[API] Payment transaction error:', txError)
      throw txError
    }
    
    // Update bill paid_amount and due_amount
    const { error: updateError } = await supabase
      .from('bills')
      .update({
        paid_amount: newPaid,
        due_amount: newDue,
      })
      .eq('id', id)
    
    if (updateError) {
      console.error('[API] Bill update error:', updateError)
      throw updateError
    }
    
    return NextResponse.json({ 
      success: true,
      paid_amount: newPaid,
      due_amount: newDue,
    })
  } catch (error: any) {
    // Handle Next.js redirect errors
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] POST /api/orders/[id]/payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 500 }
    )
  }
}

