import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get single branch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }
    
    // Check permissions (RLS will handle this, but double-check)
    if (user.role === 'tenant_owner' && user.tenant_id !== data.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ branch: data })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/branches/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch branch' },
      { status: 500 }
    )
  }
}

// PUT - Update branch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Get existing branch to check permissions
    const { data: existingBranch } = await supabase
      .from('branches')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existingBranch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'tenant_owner' && user.tenant_id !== existingBranch.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Build update object
    const updates: any = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.code !== undefined) {
      const newCode = body.code.trim().toUpperCase()
      
      // Check if code already exists for this tenant (excluding current branch)
      const { data: existingBranchWithCode } = await supabase
        .from('branches')
        .select('id')
        .eq('tenant_id', existingBranch.tenant_id)
        .eq('code', newCode)
        .neq('id', id)
        .maybeSingle()
      
      if (existingBranchWithCode) {
        return NextResponse.json(
          { error: `Branch code "${newCode}" already exists for this tenant` },
          { status: 400 }
        )
      }
      
      updates.code = newCode
    }
    if (body.address !== undefined) updates.address = body.address?.trim() || null
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null
    if (body.is_active !== undefined) updates.is_active = body.is_active
    
    const { data, error } = await supabase
      .from('branches')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return NextResponse.json({ branch: data })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] PUT /api/branches/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update branch' },
      { status: 500 }
    )
  }
}

// DELETE - Delete branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get existing branch to check permissions
    const { data: existingBranch } = await supabase
      .from('branches')
      .select('tenant_id')
      .eq('id', id)
      .single()
    
    if (!existingBranch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role !== 'superadmin' && user.role !== 'tenant_owner') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    if (user.role === 'tenant_owner' && user.tenant_id !== existingBranch.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Check if there are active staff members assigned to this branch
    const { data: assignedStaff, error: staffCheckError } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('branch_id', id)
      .eq('is_active', true)
    
    if (staffCheckError) {
      return NextResponse.json(
        { error: `Failed to check assigned staff: ${staffCheckError.message}` },
        { status: 500 }
      )
    }
    
    if (assignedStaff && assignedStaff.length > 0) {
      const staffNames = assignedStaff.slice(0, 3).map(s => s.full_name).join(', ')
      const moreCount = assignedStaff.length > 3 ? ` and ${assignedStaff.length - 3} more` : ''
      return NextResponse.json(
        { 
          error: `Cannot delete branch. There are ${assignedStaff.length} active staff member(s) assigned: ${staffNames}${moreCount}. Please reassign or deactivate them first.` 
        },
        { status: 400 }
      )
    }
    
    // Check for active transactions (bills, purchases, stock, expenses)
    // Note: We'll do a soft check - if there are any records, warn but allow deletion
    // In production, you might want to prevent deletion if there are transactions
    
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] DELETE /api/branches/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete branch' },
      { status: 500 }
    )
  }
}

