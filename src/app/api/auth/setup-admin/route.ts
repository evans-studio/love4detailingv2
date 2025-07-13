import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a service role client for admin operations
const createServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    // This is a development-only endpoint for setting up admin users
    // In production, admin users should be created through proper admin tools
    
    const body = await request.json()
    const { email, password, fullName, role = 'admin' } = body

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'super_admin', 'staff'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, super_admin, or staff' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Create the auth user  
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for dev
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 500 }
      )
    }

    // Create the user profile record
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
        role: role as any,
        is_active: true,
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    if (profileError) {
      // If profile creation fails, we should clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Admin user created successfully`,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName,
        role: role
      }
    })

  } catch (error) {
    console.error('Admin setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 