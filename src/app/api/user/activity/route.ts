import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { auditLogger } from '@/lib/services/audit-logger'
import { log } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Use service role to get comprehensive activity data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('📊 Fetching recent activity for user:', user.id)

    // Get recent bookings for activity
    const { data: bookings, error: bookingsError } = await serviceSupabase
      .from('bookings')
      .select(`
        id,
        reference_number,
        status,
        total_price_pence,
        created_at,
        updated_at,
        vehicle_make,
        vehicle_model,
        service_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (bookingsError) {
      console.error('Error fetching bookings for activity:', bookingsError)
    }

    // Get recent vehicles for activity
    const { data: vehicles, error: vehiclesError } = await serviceSupabase
      .from('vehicles')
      .select(`
        id,
        make,
        model,
        registration,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (vehiclesError) {
      console.error('Error fetching vehicles for activity:', vehiclesError)
    }

    // Get recent reward transactions for activity
    const { data: rewardTransactions, error: rewardError } = await serviceSupabase
      .from('reward_transactions')
      .select(`
        id,
        transaction_type,
        points_change,
        description,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (rewardError) {
      console.error('Error fetching reward transactions for activity:', rewardError)
    }

    // Combine all activities and sort by date
    const activities: any[] = []

    // Add booking activities
    bookings?.forEach(booking => {
      activities.push({
        id: `booking_${booking.id}`,
        type: 'booking',
        title: 'Booking Created',
        description: `Booked service for ${booking.vehicle_make} ${booking.vehicle_model}`,
        details: {
          reference: booking.reference_number,
          status: booking.status,
          price: booking.total_price_pence,
          priceFormatted: `£${(booking.total_price_pence / 100).toFixed(2)}`,
          vehicle: `${booking.vehicle_make} ${booking.vehicle_model}`
        },
        timestamp: booking.created_at,
        icon: 'calendar',
        color: 'blue'
      })

      // Add status change activities if updated
      if (booking.updated_at !== booking.created_at) {
        activities.push({
          id: `booking_update_${booking.id}`,
          type: 'booking_update',
          title: 'Booking Updated',
          description: `Booking ${booking.reference_number} status changed to ${booking.status}`,
          details: {
            reference: booking.reference_number,
            status: booking.status,
            vehicle: `${booking.vehicle_make} ${booking.vehicle_model}`
          },
          timestamp: booking.updated_at,
          icon: 'clock',
          color: 'orange'
        })
      }
    })

    // Add vehicle activities
    vehicles?.forEach(vehicle => {
      activities.push({
        id: `vehicle_${vehicle.id}`,
        type: 'vehicle',
        title: 'Vehicle Added',
        description: `Added ${vehicle.make} ${vehicle.model} to your garage`,
        details: {
          make: vehicle.make,
          model: vehicle.model,
          registration: vehicle.registration,
          displayName: `${vehicle.make} ${vehicle.model}`
        },
        timestamp: vehicle.created_at,
        icon: 'car',
        color: 'green'
      })
    })

    // Add reward activities
    rewardTransactions?.forEach(transaction => {
      const isEarned = transaction.points_change > 0
      activities.push({
        id: `reward_${transaction.id}`,
        type: 'reward',
        title: isEarned ? 'Points Earned' : 'Points Redeemed',
        description: transaction.description || `${isEarned ? 'Earned' : 'Redeemed'} ${Math.abs(transaction.points_change)} points`,
        details: {
          points: transaction.points_change,
          transactionType: transaction.transaction_type,
          isEarned: isEarned
        },
        timestamp: transaction.created_at,
        icon: 'star',
        color: isEarned ? 'yellow' : 'purple'
      })
    })

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Take only the requested limit
    const recentActivities = activities.slice(0, limit)

    console.log('✅ Successfully fetched recent activity:', {
      userId: user.id,
      totalActivities: activities.length,
      returnedActivities: recentActivities.length
    })

    return NextResponse.json({
      data: recentActivities,
      meta: {
        total: activities.length,
        limit: limit,
        hasMore: activities.length > limit
      }
    })

  } catch (error) {
    console.error('User activity API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Log user activity tracking events
async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activities = await request.json()
    
    // Ensure activities is an array
    const activityArray = Array.isArray(activities) ? activities : [activities]
    
    // Log context for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Activity tracking request:', {
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        sessionId: user.id
      })
    }

    const loggedActivities = []

    for (const activity of activityArray) {
      try {
        const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        auditLogger.logUserActivity(
          user.id,
          activity.action || 'custom',
          {
            type: activity.type || 'custom',
            description: activity.description || `${activity.action} - ${activity.label || ''}`,
            url: activity.url,
            referrer: activity.referrer,
            deviceInfo: activity.deviceInfo,
            locationInfo: activity.locationInfo,
            duration: activity.duration,
            data: activity.data,
            timestamp: activity.timestamp || new Date().toISOString()
          }
        )

        loggedActivities.push({ id: activityId, originalActivity: activity })

      } catch (error) {
        log.error('Error logging individual activity', error as Error, {
          component: 'user-activity-api',
          userId: user.id,
          activity: activity
        })
      }
    }

    log.info('User activities logged', {
      component: 'user-activity-api',
      userId: user.id,
      metadata: {
        activitiesCount: activityArray.length,
        successCount: loggedActivities.length
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        logged: loggedActivities.length,
        total: activityArray.length,
        activities: loggedActivities
      }
    })

  } catch (error) {
    log.error('User activity API error', error as Error, {
      component: 'user-activity-api'
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export { POST }