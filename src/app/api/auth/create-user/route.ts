import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * API route to create user record in database
 * This is called from the client after successful authentication
 */
export async function POST(request: Request) {
  try {
    const { userId, email, fullName, role } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the authenticated user matches the userId
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user record already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingUser) {
      return NextResponse.json({
        success: true,
        user: existingUser,
        message: 'User record already exists',
      })
    }

    // Create user record
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: fullName || email.split('@')[0] || 'User',
        role: role || 'branch_staff',
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user record:', insertError)
      return NextResponse.json(
        { 
          error: 'Failed to create user record',
          details: insertError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: newUser,
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}


