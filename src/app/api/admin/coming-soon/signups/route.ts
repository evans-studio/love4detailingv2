import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get the current user and verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userData?.role || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all coming soon signups
    const { data: signups, error: signupsError } = await supabase
      .from('coming_soon_signups')
      .select('*')
      .order('created_at', { ascending: false })

    if (signupsError) {
      console.error('Error fetching signups:', signupsError)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch signups' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signups: signups || []
    })

  } catch (error) {
    console.error('Admin signups API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}