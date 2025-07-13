import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET user email preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching email preferences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email preferences' },
        { status: 500 }
      )
    }

    // Return default preferences if none exist
    const preferences = data || {
      user_id: userId,
      booking_confirmations: true,
      booking_reminders: true,
      booking_updates: true,
      service_notifications: true,
      loyalty_notifications: true,
      marketing_emails: true,
      weekly_digest: false,
      sms_notifications: false
    }

    return NextResponse.json({ 
      success: true,
      preferences 
    })

  } catch (error) {
    console.error('❌ Email preferences GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE user email preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, preferences } = body

    if (!user_id || !preferences) {
      return NextResponse.json(
        { error: 'User ID and preferences are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Validate preference fields
    const validFields = [
      'booking_confirmations',
      'booking_reminders', 
      'booking_updates',
      'service_notifications',
      'loyalty_notifications',
      'marketing_emails',
      'weekly_digest',
      'sms_notifications'
    ]

    const updateData: any = { user_id }
    
    for (const field of validFields) {
      if (field in preferences) {
        updateData[field] = Boolean(preferences[field])
      }
    }

    const { data, error } = await supabase
      .from('user_email_preferences')
      .upsert(updateData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating email preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update email preferences' },
        { status: 500 }
      )
    }

    console.log('✅ Email preferences updated successfully:', { user_id })

    return NextResponse.json({ 
      success: true,
      preferences: data 
    })

  } catch (error) {
    console.error('❌ Email preferences PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}