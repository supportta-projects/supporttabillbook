import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

// GET - List users (tenant owner can see their tenant's users, branch admin sees branch users)
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const supabase = await createClient()
    
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Tenant owners see all users in their tenant
    if (user.role === 'tenant_owner' && user.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id)
    }
    // Branch admins see users in their branch
    else if (user.role === 'branch_admin' && user.branch_id) {
      query = query.eq('branch_id', user.branch_id)
    }
    // Branch staff can't list users
    else if (user.role === 'branch_staff') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Filter by branch if specified
    if (branchId) {
      query = query.eq('branch_id', branchId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return NextResponse.json({ users: data })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] GET /api/users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST - Create user/staff (tenant owner or branch admin) - Optimized
export async function POST(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Only tenant owners and branch admins can create users
    if (user.role !== 'tenant_owner' && user.role !== 'branch_admin') {
      return NextResponse.json(
        { error: 'You do not have permission to create users' },
        { status: 403 }
      )
    }
    
    // Validation
    if (!body.email || !body.password || !body.full_name || !body.role) {
      return NextResponse.json(
        { error: 'Email, password, full_name, and role are required' },
        { status: 400 }
      )
    }
    
    // Validate role
    const allowedRoles = ['branch_admin', 'branch_staff']
    if (!allowedRoles.includes(body.role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${allowedRoles.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate password length
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }
    
    // Check if email already exists (optimized - use maybeSingle)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.email.trim().toLowerCase())
      .maybeSingle() // Use maybeSingle to avoid error if not found
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      )
    }
    
    // Determine tenant_id and branch_id
    let tenantId = body.tenant_id || user.tenant_id
    // Handle empty string as null - empty string means no branch assigned
    let branchId = (body.branch_id && body.branch_id.trim() !== '') 
      ? body.branch_id.trim() 
      : (user.branch_id || null)
    
    // Branch ID is now required for staff creation
    if (!branchId || branchId.trim() === '') {
      return NextResponse.json(
        { error: 'Branch assignment is required. Staff members must be assigned to a branch.' },
        { status: 400 }
      )
    }
    
    // Tenant owners can assign to any branch in their tenant
    if (user.role === 'tenant_owner') {
      // Verify branch belongs to tenant (optimized - use maybeSingle)
      const { data: branch } = await supabase
        .from('branches')
        .select('tenant_id, is_active')
        .eq('id', branchId)
        .maybeSingle()
      
      if (!branch) {
        return NextResponse.json(
          { error: 'Branch not found' },
          { status: 404 }
        )
      }
      
      if (branch.tenant_id !== tenantId) {
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
    // Branch admins can only create users for their branch
    else if (user.role === 'branch_admin') {
      if (branchId !== user.branch_id) {
        return NextResponse.json(
          { error: 'You can only create users for your own branch' },
          { status: 403 }
        )
      }
      tenantId = user.tenant_id
    }
    
    // Optional: Check if branch already has an admin (for informational purposes)
    // Allow multiple admins per branch, but we can log this
    if (body.role === 'branch_admin' && branchId) {
      const { data: existingAdmins } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('branch_id', branchId)
        .eq('role', 'branch_admin')
        .eq('is_active', true)
      
      // Log for reference (multiple admins are allowed)
      if (existingAdmins && existingAdmins.length > 0) {
        console.log(`[INFO] Branch ${branchId} already has ${existingAdmins.length} admin(s)`)
      }
    }
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name.trim(),
        role: body.role,
      },
    })
    
    if (authError) {
      return NextResponse.json(
        { error: `Failed to create user account: ${authError.message}` },
        { status: 500 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }
    
    // Create user record in users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: body.email.trim().toLowerCase(),
        full_name: body.full_name.trim(),
        role: body.role,
        tenant_id: tenantId,
        branch_id: branchId || null,
        is_active: true,
      })
      .select()
      .single()
    
    if (userError) {
      // Rollback: Delete auth user if user record creation fails
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 500 }
      )
    }
    
    const duration = Date.now() - startTime
    console.log(`[PERF] POST /api/users: ${duration}ms`)
    
    return NextResponse.json({ user: newUser }, { 
      status: 201,
      headers: {
        'X-Response-Time': `${duration}ms`
      }
    })
  } catch (error: any) {
    // Handle Next.js redirect errors (NEXT_REDIRECT)
    if (error?.message?.includes('redirect') || error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      )
    }
    console.error('[API] POST /api/users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}

