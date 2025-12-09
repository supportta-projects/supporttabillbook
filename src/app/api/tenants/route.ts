import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/utils'

// GET - List all tenants (superadmin only)
export async function GET() {
  try {
    const user = await requireRole('superadmin')
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return NextResponse.json({ tenants: data })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

// POST - Create tenant with shop owner account (superadmin only)
export async function POST(request: Request) {
  try {
    const user = await requireRole('superadmin')
    const body = await request.json()
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Validation
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    if (!body.owner_email || !body.owner_password || !body.owner_name) {
      return NextResponse.json(
        { error: 'Owner email, password, and name are required' },
        { status: 400 }
      )
    }
    
    // Validate code format
    if (!/^[A-Z0-9_-]+$/.test(body.code.toUpperCase())) {
      return NextResponse.json(
        { error: 'Code must contain only uppercase letters, numbers, hyphens, or underscores' },
        { status: 400 }
      )
    }

    // Validate password length
    if (body.owner_password.length < 6) {
      return NextResponse.json(
        { error: 'Owner password must be at least 6 characters' },
        { status: 400 }
      )
    }
    
    // Check if tenant code already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('code', body.code.toUpperCase())
      .single()
    
    if (existingTenant) {
      return NextResponse.json(
        { error: 'Tenant code already exists' },
        { status: 400 }
      )
    }

    // Check if owner email already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.owner_email.trim().toLowerCase())
      .single()
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Owner email is already registered. Please use a different email.' },
        { status: 400 }
      )
    }

    // Check if owner email already exists in Auth
    const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
    const existingAuthUser = authUsers?.find(u => u.email === body.owner_email.trim().toLowerCase())
    
    if (existingAuthUser) {
      return NextResponse.json(
        { error: 'Owner email is already registered. Please use a different email.' },
        { status: 400 }
      )
    }
    
    // Step 1: Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        is_active: true,
      })
      .select()
      .single()
    
    if (tenantError) throw tenantError
    if (!tenant) {
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      )
    }

    // Step 2: Create user in Supabase Auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: body.owner_email.trim().toLowerCase(),
      password: body.owner_password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: body.owner_name.trim(),
        role: 'tenant_owner',
      },
    })

    if (authError) {
      // Rollback: Delete tenant if user creation fails
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { error: `Failed to create owner account: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      // Rollback: Delete tenant if user creation fails
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { error: 'Failed to create owner account: No user data returned' },
        { status: 500 }
      )
    }

    // Step 3: Create user record in users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: body.owner_email.trim().toLowerCase(),
        full_name: body.owner_name.trim(),
        role: 'tenant_owner',
        tenant_id: tenant.id,
        is_active: true,
      })
      .select()
      .single()

    if (userError) {
      // Rollback: Delete tenant and auth user if user record creation fails
      await supabase.from('tenants').delete().eq('id', tenant.id)
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        tenant,
        owner: {
          email: body.owner_email.trim().toLowerCase(),
          name: body.owner_name.trim(),
        },
        message: 'Tenant and owner account created successfully'
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    )
  }
}

