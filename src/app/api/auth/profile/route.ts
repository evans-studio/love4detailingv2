import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('Auth user:', user?.id, user?.email)
    
    if (userError || !user) {
      console.log('Auth error:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile directly from users table using service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: userProfile, error } = await serviceSupabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at,
        last_login_at,
        email_verified_at
      `)
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      console.log('Looking for user ID:', user.id)
      console.log('Available users in database:')
      
      // Show all users to debug
      const { data: allUsers } = await serviceSupabase
        .from('users')
        .select('id, email, role')
      
      console.log('All users:', allUsers)
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if profile is complete (has full_name and phone)
    const isProfileComplete = !!(userProfile.full_name && userProfile.phone)

    // Transform to match expected format
    const transformedProfile = {
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name,
      phone: userProfile.phone,
      role: userProfile.role,
      is_active: userProfile.is_active,
      profile_complete: isProfileComplete,
      user_journey: 'account-first', // Default value since we don't have this column
      registration_date: userProfile.created_at,
      last_login: userProfile.last_login_at,
      email_verified_at: userProfile.email_verified_at
    }

    return NextResponse.json({ data: transformedProfile })
  } catch (error) {
    console.error('Error in profile GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const profileData = body.profileData || body

    if (!profileData) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      )
    }

    // Update user profile using service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: updatedProfile, error } = await serviceSupabase
      .from('users')
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at,
        last_login_at,
        email_verified_at
      `)
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if profile is complete (has full_name and phone)
    const isProfileComplete = !!(updatedProfile.full_name && updatedProfile.phone)

    // Transform to match expected format
    const transformedProfile = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      full_name: updatedProfile.full_name,
      phone: updatedProfile.phone,
      role: updatedProfile.role,
      is_active: updatedProfile.is_active,
      profile_complete: isProfileComplete,
      user_journey: 'account-first', // Default value since we don't have this column
      registration_date: updatedProfile.created_at,
      last_login: updatedProfile.last_login_at,
      email_verified_at: updatedProfile.email_verified_at
    }

    return NextResponse.json({ data: transformedProfile })
  } catch (error) {
    console.error('Error in profile PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}