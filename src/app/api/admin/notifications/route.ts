import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET notifications for admin user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '10')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    console.log('📱 Fetching notifications for user:', userId)

    // Verify user has admin permissions
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    // Allow access if user_profiles table doesn't exist (initial setup) or user is admin
    if (profileError && !profileError.message.includes('does not exist')) {
      console.error('❌ Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      )
    }

    if (profile && !['admin', 'super_admin', 'staff'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Build query for notifications
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Add unread filter if requested
    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    // Add expiration filter
    query = query.or('expires_at.is.null,expires_at.gt.now()')

    // Apply limit
    query = query.limit(limit)

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError)
      
      // If notifications table doesn't exist, return empty result
      if (notificationsError.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          notifications: [],
          unread_count: 0,
          message: 'Notification system not yet initialized'
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get unread count
    const { data: unreadCountResult, error: countError } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: userId })

    const unreadCount = countError ? 0 : unreadCountResult || 0

    console.log('✅ Notifications fetched:', {
      count: notifications?.length || 0,
      unread_count: unreadCount
    })

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unread_count: unreadCount
    })

  } catch (error) {
    console.error('❌ Notifications API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST mark notification as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notification_id, user_id, action } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    console.log('📱 Notification action:', { action, notification_id, user_id })

    if (action === 'mark_read' && notification_id) {
      // Mark specific notification as read
      const { data, error } = await supabase
        .rpc('mark_notification_read', {
          p_notification_id: notification_id,
          p_user_id: user_id
        })

      if (error) {
        console.error('❌ Error marking notification as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        marked_read: data
      })

    } else if (action === 'mark_all_read') {
      // Mark all notifications as read
      const { data, error } = await supabase
        .rpc('mark_all_notifications_read', {
          p_user_id: user_id
        })

      if (error) {
        console.error('❌ Error marking all notifications as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        marked_count: data || 0
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing notification_id' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Notification action API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}