import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Wrap everything in try-catch to ensure we always return JSON
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      )
    }

    const { email, password, requireRole } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create Supabase client with error handling
    let supabase
    try {
      supabase = await createClient()
    } catch (clientError: any) {
      console.error('Failed to create Supabase client:', clientError)
      return NextResponse.json(
        { 
          error: 'Server configuration error. Please check environment variables.',
          details: process.env.NODE_ENV === 'development' ? clientError.message : undefined
        },
        { status: 500 }
      )
    }

    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message || 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // Ensure user record exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (!existingUser) {
      // Create user record if it doesn't exist
      // This handles cases where user was created in Auth but not in users table
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email || email,
          full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
          role: authData.user.user_metadata?.role || 'branch_staff', // Default role
          is_active: true,
        })

      if (insertError) {
        console.error('Error creating user record:', insertError)
        // Don't fail login if user record creation fails, but log it
      }
    } else {
      // Update last login or any other metadata if needed
      await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', authData.user.id)
    }

    // Get the user record (either existing or newly created)
    const { data: userRecord } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (!userRecord) {
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (!userRecord.is_active) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      )
    }

    // Role-based access control
    if (requireRole) {
      // If requireRole is specified (e.g., 'superadmin'), validate it
      if (userRecord.role !== requireRole) {
        return NextResponse.json(
          { error: `Access denied. This login requires ${requireRole} role.` },
          { status: 403 }
        )
      }
    } else {
      // Default login route blocks superadmin
      if (userRecord.role === 'superadmin') {
        return NextResponse.json(
          { error: 'Superadmin login is not available here. Please use /superadmin/login' },
          { status: 403 }
        )
      }
    }

    // Determine redirect path based on role
    let redirectPath = '/'
    if (userRecord) {
      switch (userRecord.role) {
        case 'superadmin':
          redirectPath = '/superadmin/dashboard'
          break
        case 'tenant_owner':
          redirectPath = '/owner/dashboard'
          break
        case 'branch_admin':
        case 'branch_staff':
          redirectPath = '/branch/dashboard'
          break
        default:
          redirectPath = '/'
      }
    }

    return NextResponse.json({
      success: true,
      user: userRecord,
      redirect: redirectPath,
    })
  } catch (error: any) {
    // Log the full error for debugging
    console.error('Login API Error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error message:', error?.message)
    
    // Ensure we always return JSON, even on unexpected errors
    const errorMessage = error?.message || 'An unexpected error occurred'
    
    // Return JSON response with error details
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        } : undefined
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

