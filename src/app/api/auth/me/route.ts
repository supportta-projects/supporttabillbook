import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Fetch user profile from database
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !userProfile) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({ user: userProfile })
  } catch (error) {
    console.error('Error getting current user:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}

