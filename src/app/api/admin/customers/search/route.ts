import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET search customers for admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const adminId = searchParams.get('admin_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        customers: []
      })
    }

    console.log('🔍 Searching customers:', { query, adminId })

    // Verify admin permissions
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', adminId)
      .single()

    // Allow access if user_profiles table doesn't exist (initial setup) or user is admin
    if (profileError && !profileError.message.includes('does not exist')) {
      console.error('❌ Error fetching admin profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to verify admin permissions' },
        { status: 500 }
      )
    }

    if (adminProfile && !['admin', 'super_admin', 'staff'].includes(adminProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Search in auth.users table
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('❌ Error searching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to search customers' },
        { status: 500 }
      )
    }

    // Filter users based on search query
    const searchLower = query.toLowerCase()
    const filteredUsers = users.users
      .filter(user => {
        const email = user.email?.toLowerCase() || ''
        const fullName = user.user_metadata?.full_name?.toLowerCase() || ''
        const phone = user.phone || ''
        
        return email.includes(searchLower) || 
               fullName.includes(searchLower) || 
               phone.includes(searchLower)
      })
      .slice(0, limit)

    // Get additional profile data if available
    const customerResults = await Promise.all(
      filteredUsers.map(async (user) => {
        // Try to get profile data
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        // Get booking count
        const { count: bookingCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)

        // Extract name from email if no full_name available
        const emailName = user.email ? user.email.split('@')[0].replace(/[._]/g, ' ') : ''
        const displayName = user.user_metadata?.full_name || 
                           profile?.full_name || 
                           emailName || 
                           'Customer'

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          full_name: displayName,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          profile: profile || null,
          booking_count: bookingCount || 0,
          is_existing_customer: true
        }
      })
    )

    console.log('✅ Customer search completed:', {
      query,
      results_count: customerResults.length
    })

    return NextResponse.json({
      success: true,
      customers: customerResults
    })

  } catch (error) {
    console.error('❌ Customer search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}