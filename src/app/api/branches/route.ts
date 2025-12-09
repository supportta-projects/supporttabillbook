import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth/utils'

// GET - List branches (tenant owner can see their branches, superadmin sees all)
export async function GET(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    let query = supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Tenant owners can only see their tenant's branches
    if (user.role === 'tenant_owner' && user.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    const duration = Date.now() - startTime
    console.log(`[PERF] GET /api/branches: ${duration}ms`)
    
    return NextResponse.json({ branches: data || [] }, {
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
    return NextResponse.json(
      { error: error.message || 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}

// POST - Create branch with optional branch admin (tenant owner or superadmin) - Optimized
export async function POST(request: Request) {
  const startTime = Date.now()
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Validation
    if (!body.name || !body.code || !body.tenant_id) {
      return NextResponse.json(
        { error: 'Name, code, and tenant_id are required' },
        { status: 400 }
      )
    }
    
    // Check permissions
    if (user.role === 'tenant_owner' && user.tenant_id !== body.tenant_id) {
      return NextResponse.json(
        { error: 'You can only create branches for your tenant' },
        { status: 403 }
      )
    }
    
    // Check if code already exists for this tenant (optimized query)
    const { data: existing } = await supabase
      .from('branches')
      .select('id')
      .eq('tenant_id', body.tenant_id)
      .eq('code', body.code.toUpperCase())
      .maybeSingle()
    
    if (existing) {
      return NextResponse.json(
        { error: 'Branch code already exists for this tenant' },
        { status: 400 }
      )
    }
    
    // Validate admin creation data if requested
    const shouldCreateAdmin = body.create_admin === true
    if (shouldCreateAdmin) {
      if (!body.admin_name || !body.admin_email || !body.admin_password) {
        return NextResponse.json(
          { error: 'Admin name, email, and password are required when creating branch admin' },
          { status: 400 }
        )
      }
      
      if (body.admin_password.length < 6) {
        return NextResponse.json(
          { error: 'Admin password must be at least 6 characters' },
          { status: 400 }
        )
      }
      
      // Check if admin email already exists
      const { data: existingAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('email', body.admin_email.trim().toLowerCase())
        .maybeSingle()
      
      if (existingAdmin) {
        return NextResponse.json(
          { error: 'Admin email is already registered' },
          { status: 400 }
        )
      }
    }
    
    // Create branch first
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .insert({
        tenant_id: body.tenant_id,
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        is_active: true,
      })
      .select()
      .single()
    
    if (branchError) {
      return NextResponse.json(
        { error: `Failed to create branch: ${branchError.message}` },
        { status: 500 }
      )
    }
    
    if (!branch) {
      return NextResponse.json(
        { error: 'Failed to create branch' },
        { status: 500 }
      )
    }
    
    // When creating a new branch, set all products inactive until stock is added
    // This ensures products are only active when they have stock in the branch
    await supabase
      .from('products')
      .update({ is_active: false })
      .eq('tenant_id', body.tenant_id)
    
    // Create branch admin if requested
    let adminUser = null
    if (shouldCreateAdmin && body.admin_name && body.admin_email && body.admin_password) {
      try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
          email: body.admin_email.trim().toLowerCase(),
          password: body.admin_password,
          email_confirm: true,
          user_metadata: {
            full_name: body.admin_name.trim(),
            role: 'branch_admin',
          },
        })
        
        if (authError) {
          // Rollback: Delete branch if admin creation fails
          await supabase.from('branches').delete().eq('id', branch.id)
          return NextResponse.json(
            { error: `Failed to create branch admin: ${authError.message}` },
            { status: 500 }
          )
        }
        
        if (!authData.user) {
          // Rollback: Delete branch
          await supabase.from('branches').delete().eq('id', branch.id)
          return NextResponse.json(
            { error: 'Failed to create branch admin account' },
            { status: 500 }
          )
        }
        
        // Create user record in users table
        const { data: newAdmin, error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: body.admin_email.trim().toLowerCase(),
            full_name: body.admin_name.trim(),
            role: 'branch_admin',
            tenant_id: body.tenant_id,
            branch_id: branch.id,
            is_active: true,
          })
          .select()
          .single()
        
        if (userError) {
          // Rollback: Delete auth user and branch
          const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(authData.user.id)
          if (deleteAuthError) {
            console.error('[ROLLBACK] Failed to delete auth user:', deleteAuthError)
          }
          const { error: deleteBranchError } = await supabase.from('branches').delete().eq('id', branch.id)
          if (deleteBranchError) {
            console.error('[ROLLBACK] Failed to delete branch:', deleteBranchError)
          }
          return NextResponse.json(
            { error: `Failed to create admin user record: ${userError.message}` },
            { status: 500 }
          )
        }
        
        adminUser = newAdmin
      } catch (adminError: any) {
        // Rollback: Delete branch if admin creation fails
        const { error: deleteError } = await supabase.from('branches').delete().eq('id', branch.id)
        if (deleteError) {
          console.error('[ROLLBACK] Failed to delete branch after admin creation failure:', deleteError)
        }
        return NextResponse.json(
          { error: `Failed to create branch admin: ${adminError.message || 'Unknown error'}` },
          { status: 500 }
        )
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[PERF] POST /api/branches: ${duration}ms`)
    
    return NextResponse.json({ 
      branch,
      admin: adminUser,
      message: adminUser 
        ? 'Branch and admin created successfully' 
        : 'Branch created successfully'
    }, { 
      status: 201,
      headers: {
        'X-Response-Time': `${duration}ms`
      }
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create branch' },
      { status: 500 }
    )
  }
}
