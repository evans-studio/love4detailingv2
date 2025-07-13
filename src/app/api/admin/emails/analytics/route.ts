import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET email analytics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Email analytics API called')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    const days = parseInt(searchParams.get('days') || '30')

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }

    // Verify admin permissions - handle case where user_profiles table doesn't exist
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', adminId)
      .single()

    console.log('🔍 Admin profile check:', { 
      adminId, 
      profile: adminProfile, 
      error: profileError 
    })

    // If user_profiles table doesn't exist, check if this is the initial admin user
    if (profileError && profileError.message.includes('does not exist')) {
      console.log('⚠️ user_profiles table does not exist, checking if this is the initial admin setup')
      
      // Allow access for the specific admin ID during initial setup
      if (adminId === 'c14dbb9f-fc80-488c-9435-a1af85855d53') {
        console.log('✅ Allowing access for initial admin setup')
      } else {
        return NextResponse.json(
          { error: 'Database setup incomplete - user profiles table not found' },
          { status: 503 }
        )
      }
    } else if (profileError) {
      console.error('❌ Error fetching admin profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to verify admin permissions', details: profileError.message },
        { status: 500 }
      )
    } else if (!adminProfile || !['admin', 'super_admin', 'staff'].includes(adminProfile.role)) {
      console.warn('⚠️ Insufficient permissions for email analytics:', { 
        adminId, 
        role: adminProfile?.role 
      })
      return NextResponse.json(
        { error: 'Insufficient permissions', userRole: adminProfile?.role || 'none' },
        { status: 403 }
      )
    }

    console.log('✅ Admin permissions verified:', { adminId, role: adminProfile?.role || 'initial_admin' })

    // Check if email tables exist, if not return empty data
    const { data: tableCheck, error: tableError } = await supabase
      .from('email_notifications')
      .select('id')
      .limit(1)

    console.log('🔍 Email table check:', { data: tableCheck, error: tableError })

    // If email tables don't exist yet, return empty analytics
    if (tableError || !tableCheck) {
      console.log('ℹ️ Email tables not yet created, returning empty analytics')
      const emptyResult = {
        success: true,
        period_days: days,
        summary: {
          total_emails: 0,
          delivered_emails: 0,
          failed_emails: 0,
          delivery_rate: '0.00'
        },
        email_types: {},
        daily_analytics: [],
        recent_emails: [],
        generated_at: new Date().toISOString(),
        note: 'Email system tables not yet initialized'
      }
      return NextResponse.json(emptyResult)
    }

    // Get email analytics from the view
    const { data: analytics, error: analyticsError } = await supabase
      .from('email_analytics')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (analyticsError) {
      console.error('❌ Error fetching email analytics:', analyticsError)
      // Return empty analytics if view doesn't exist yet
      const emptyResult = {
        success: true,
        period_days: days,
        summary: {
          total_emails: 0,
          delivered_emails: 0,
          failed_emails: 0,
          delivery_rate: '0.00'
        },
        email_types: {},
        daily_analytics: [],
        recent_emails: [],
        generated_at: new Date().toISOString(),
        note: 'Email analytics view not yet available'
      }
      return NextResponse.json(emptyResult)
    }

    // Get overall summary stats
    const { data: overallStats, error: statsError } = await supabase
      .from('email_notifications')
      .select('email_type, delivery_status, sent_at')
      .gte('sent_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

    console.log('📊 Overall stats query:', { data: overallStats, error: statsError })

    if (statsError) {
      console.error('❌ Error fetching email stats:', statsError)
      // Return empty analytics if we can't fetch basic stats
      const emptyResult = {
        success: true,
        period_days: days,
        summary: {
          total_emails: 0,
          delivered_emails: 0,
          failed_emails: 0,
          delivery_rate: '0.00'
        },
        email_types: {},
        daily_analytics: [],
        recent_emails: [],
        generated_at: new Date().toISOString(),
        note: 'Email statistics temporarily unavailable'
      }
      return NextResponse.json(emptyResult)
    }

    // Calculate summary statistics
    const totalEmails = overallStats?.length || 0
    const deliveredEmails = overallStats?.filter(e => e.delivery_status === 'delivered').length || 0
    const failedEmails = overallStats?.filter(e => e.delivery_status === 'failed').length || 0
    
    // Group by email type
    const emailTypeStats = overallStats?.reduce((acc: any, email) => {
      if (!acc[email.email_type]) {
        acc[email.email_type] = { total: 0, delivered: 0, failed: 0 }
      }
      acc[email.email_type].total++
      if (email.delivery_status === 'delivered') {
        acc[email.email_type].delivered++
      } else if (email.delivery_status === 'failed') {
        acc[email.email_type].failed++
      }
      return acc
    }, {}) || {}

    // Get recent email notifications
    const { data: recentEmails, error: recentError } = await supabase
      .from('email_notifications')
      .select(`
        id,
        email_type,
        email_address,
        subject,
        delivery_status,
        sent_at,
        opened_at,
        clicked_at,
        error_message
      `)
      .order('sent_at', { ascending: false })
      .limit(50)

    console.log('📮 Recent emails query:', { count: recentEmails?.length, error: recentError })

    if (recentError) {
      console.error('❌ Error fetching recent emails:', recentError)
      // Continue with empty recent emails - don't fail the whole response
    }

    const result = {
      success: true,
      period_days: days,
      summary: {
        total_emails: totalEmails,
        delivered_emails: deliveredEmails,
        failed_emails: failedEmails,
        delivery_rate: totalEmails > 0 ? ((deliveredEmails / totalEmails) * 100).toFixed(2) : '0.00'
      },
      email_types: emailTypeStats,
      daily_analytics: analytics || [],
      recent_emails: recentEmails || [],
      generated_at: new Date().toISOString()
    }

    console.log('✅ Email analytics fetched successfully:', {
      total_emails: totalEmails,
      delivery_rate: result.summary.delivery_rate
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Email analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET email notification details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { admin_id, email_id } = body

    if (!admin_id || !email_id) {
      return NextResponse.json(
        { error: 'Admin ID and email ID required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify admin permissions
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', admin_id)
      .single()

    if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get email notification details
    const { data: emailDetails, error } = await supabase
      .from('email_notifications')
      .select(`
        *,
        bookings(booking_reference, service_date, service_time),
        users:user_id(email)
      `)
      .eq('id', email_id)
      .single()

    if (error) {
      console.error('❌ Error fetching email details:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email details' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      email: emailDetails
    })

  } catch (error) {
    console.error('❌ Email details API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}