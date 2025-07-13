import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User profile API called')
    
    // Get authenticated user using server-side auth
    const supabase = createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.id, user.email)

    // Use service role to get comprehensive user data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user profile data - simplified to avoid field errors
    console.log('🔍 Querying user profile...')
    const { data: profile, error: profileError } = await serviceSupabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        is_active,
        email_verified_at,
        marketing_opt_in,
        preferred_communication,
        service_preferences,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('✅ Profile data fetched for user:', profile.email)

    // Get user statistics in parallel
    const [bookingsResult, vehiclesResult, rewardsResult] = await Promise.all([
      // Get booking statistics
      serviceSupabase
        .from('bookings')
        .select('id, status, total_price_pence, booking_date')
        .eq('user_id', user.id),
      
      // Get vehicle count
      serviceSupabase
        .from('vehicles')
        .select('id, registration, make, model, year, color')
        .eq('user_id', user.id)
        .eq('is_active', true),
      
      // Get reward data
      serviceSupabase
        .from('customer_rewards')
        .select('points_balance, tier')
        .eq('user_id', user.id)
        .single()
    ])

    const bookings = bookingsResult.data || []
    const vehicles = vehiclesResult.data || []
    const rewards = rewardsResult.data || { points_balance: 0, tier: 'bronze' }

    // Calculate statistics
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
    const completedBookings = bookings.filter(b => b.status === 'completed').length
    const totalSpentPence = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_price_pence || 0), 0)

    // Get recent completed bookings for profile
    const recentBookings = bookings
      .filter(b => b.status === 'completed')
      .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
      .slice(0, 3)
      .map(booking => ({
        id: booking.id,
        date: booking.booking_date,
        service: 'Mobile Valet Service',
        status: booking.status,
        total_price_pence: booking.total_price_pence
      }))

    // Transform the profile data for frontend consumption - simplified
    const transformedProfile = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name || '',
      phone: profile.phone || '',
      
      // Address information from service_preferences JSONB
      address: profile.service_preferences?.address_info?.address || '',
      city: profile.service_preferences?.address_info?.city || '',
      postcode: profile.service_preferences?.address_info?.postcode || '',
      
      // Profile details
      dateOfBirth: '',
      preferences: {
        notifications: {
          email: true,
          sms: profile.preferred_communication === 'sms',
          push: false
        },
        communication: {
          marketing: profile.marketing_opt_in || false,
          updates: true
        }
      },
      
      // Account information
      role: profile.role,
      isActive: profile.is_active,
      emailVerified: !!profile.email_verified_at,
      memberSince: profile.created_at,
      
      // Statistics
      stats: {
        totalBookings,
        confirmedBookings,
        completedBookings,
        totalSpent: totalSpentPence,
        totalSpentFormatted: `£${(totalSpentPence / 100).toFixed(2)}`,
        totalVehicles: vehicles.length,
        rewardPoints: rewards.points_balance,
        rewardTier: rewards.tier
      },
      
      // Recent data
      recentBookings,
      vehicles: vehicles.map(v => ({
        id: v.id,
        registration: v.registration || 'N/A',
        make: v.make || 'Unknown',
        model: v.model || 'Vehicle',
        year: v.year || new Date().getFullYear(),
        color: v.color || 'Unknown'
      })),
      rewards: {
        points_balance: rewards.points_balance,
        tier: rewards.tier
      },
      
      // Timestamps
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastSeenAt: profile.updated_at // Use updated_at as fallback
    }
    
    console.log('✅ Profile data transformed successfully')

    console.log('✅ Successfully fetched user profile with statistics')

    return NextResponse.json({ data: transformedProfile })

  } catch (error) {
    console.error('User profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 User profile update API called')
    
    // Get authenticated user using server-side auth
    const supabase = createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated for profile update:', user.id, user.email)

    const body = await request.json()
    const { fullName, phone, address, city, postcode, preferences } = body

    // Use service role to update user data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Prepare address data for service_preferences JSONB field
    const addressData = {
      address: address || '',
      city: city || '',
      postcode: postcode || ''
    }
    
    // Update user profile - including address in service_preferences
    console.log('🔄 Updating user profile with address data...')
    const { data: updatedProfile, error: updateError } = await serviceSupabase
      .from('users')
      .update({
        full_name: fullName,
        phone: phone,
        marketing_opt_in: preferences?.communication?.marketing || false,
        preferred_communication: preferences?.notifications?.sms ? 'sms' : 'email',
        service_preferences: {
          address_info: addressData
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    console.log('✅ Profile updated successfully for user:', user.email)

    // Extract address data from service_preferences
    const savedAddressData = updatedProfile.service_preferences?.address_info || {}
    
    // Transform the updated profile data for response
    const transformedProfile = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      fullName: updatedProfile.full_name,
      phone: updatedProfile.phone,
      address: savedAddressData.address || '',
      city: savedAddressData.city || '',
      postcode: savedAddressData.postcode || '',
      preferences: {
        notifications: {
          email: true,
          sms: updatedProfile.preferred_communication === 'sms',
          push: false
        },
        communication: {
          marketing: updatedProfile.marketing_opt_in,
          updates: true
        }
      },
      updatedAt: updatedProfile.updated_at
    }
    
    console.log('✅ Profile updated successfully')

    return NextResponse.json({ 
      data: transformedProfile,
      message: 'Profile updated successfully' 
    })

  } catch (error) {
    console.error('User profile update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}