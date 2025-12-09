import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'tenant_owner' && data.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    if (user.role === 'branch_admin' && data.branch_id !== user.branch_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ user: data })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/users/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    
    // Get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'tenant_owner' && existingUser.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    if (user.role === 'branch_admin' && existingUser.branch_id !== user.branch_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Prepare update data
    const updateData: any = {}
    if (body.full_name !== undefined) updateData.full_name = body.full_name.trim()
    if (body.role !== undefined) {
      // Only tenant owners can change roles
      if (user.role !== 'tenant_owner') {
        return NextResponse.json(
          { error: 'Only tenant owners can change user roles' },
          { status: 403 }
        )
      }
      
      // Validate role is one of the allowed values
      const allowedRoles = ['branch_admin', 'branch_staff']
      if (!allowedRoles.includes(body.role)) {
        return NextResponse.json(
          { error: `Invalid role. Role must be one of: ${allowedRoles.join(', ')}` },
          { status: 400 }
        )
      }
      
      // If changing from admin to staff, check if they're the last admin
      if (existingUser.role === 'branch_admin' && body.role === 'branch_staff' && existingUser.branch_id) {
        const { data: otherAdmins } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', existingUser.branch_id)
          .eq('role', 'branch_admin')
          .eq('is_active', true)
          .neq('id', id)
        
        if (!otherAdmins || otherAdmins.length === 0) {
          const { data: branch } = await supabase
            .from('branches')
            .select('name')
            .eq('id', existingUser.branch_id)
            .single()
          
          const branchName = branch?.name || 'this branch'
          return NextResponse.json(
            { error: `Cannot change role. This user is the last administrator of "${branchName}". Please assign another administrator first.` },
            { status: 400 }
          )
        }
      }
      
      updateData.role = body.role
    }
    if (body.branch_id !== undefined) {
      // Only tenant owners can change branch assignment
      if (user.role !== 'tenant_owner') {
        return NextResponse.json(
          { error: 'Only tenant owners can change branch assignment' },
          { status: 403 }
        )
      }
      
      // Handle empty string as null
      const newBranchId = (body.branch_id && body.branch_id.trim() !== '') 
        ? body.branch_id.trim() 
        : null
      
      // If assigning to a branch, validate it exists and belongs to tenant
      if (newBranchId) {
        const { data: branch } = await supabase
          .from('branches')
          .select('tenant_id, is_active')
          .eq('id', newBranchId)
          .maybeSingle()
        
        if (!branch) {
          return NextResponse.json(
            { error: 'Branch not found' },
            { status: 404 }
          )
        }
        
        if (branch.tenant_id !== existingUser.tenant_id) {
          return NextResponse.json(
            { error: 'Branch does not belong to your tenant' },
            { status: 403 }
          )
        }
        
        if (!branch.is_active) {
          return NextResponse.json(
            { error: 'Cannot assign staff to an inactive branch' },
            { status: 400 }
          )
        }
      }
      
      // Staff members must have a branch assignment
      if (!newBranchId && (existingUser.role === 'branch_admin' || existingUser.role === 'branch_staff')) {
        return NextResponse.json(
          { error: 'Staff members must be assigned to a branch' },
          { status: 400 }
        )
      }
      
      updateData.branch_id = newBranchId
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return NextResponse.json({ user: data })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] PUT /api/users/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user (deactivate, don't actually delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check permissions
    if (user.role === 'tenant_owner' && existingUser.tenant_id !== user.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    if (user.role === 'branch_admin' && existingUser.branch_id !== user.branch_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Don't allow deleting yourself
    if (id === user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }
    
    // Check if this is the last admin of a branch (only if they're a branch admin)
    if (existingUser.role === 'branch_admin' && existingUser.branch_id) {
      const { data: otherAdmins, error: adminCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('branch_id', existingUser.branch_id)
        .eq('role', 'branch_admin')
        .eq('is_active', true)
        .neq('id', id)
      
      if (adminCheckError) {
        return NextResponse.json(
          { error: `Failed to check branch admins: ${adminCheckError.message}` },
          { status: 500 }
        )
      }
      
      if (!otherAdmins || otherAdmins.length === 0) {
        // Get branch name for error message
        const { data: branch } = await supabase
          .from('branches')
          .select('name')
          .eq('id', existingUser.branch_id)
          .single()
        
        const branchName = branch?.name || 'this branch'
        return NextResponse.json(
          { error: `Cannot deactivate the last administrator of "${branchName}". Please assign another administrator first.` },
          { status: 400 }
        )
      }
    }
    
    // Deactivate user instead of deleting
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return NextResponse.json({ user: data })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] DELETE /api/users/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}

