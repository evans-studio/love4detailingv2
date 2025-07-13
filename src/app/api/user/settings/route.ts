import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to get user settings
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('⚙️ Fetching settings for user:', user.id)

    // Get user settings/preferences
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('preferences, email_notifications, sms_notifications, marketing_emails')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user settings:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
    }

    // Default settings structure
    const defaultSettings = {
      notifications: {
        email: true,
        sms: false,
        push: false,
        marketing: false
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'Europe/London',
        currency: 'GBP',
        dateFormat: 'dd/mm/yyyy',
        timeFormat: '24h'
      },
      privacy: {
        profileVisibility: 'private',
        shareData: false,
        analytics: true
      },
      communication: {
        preferredContact: 'email',
        bookingReminders: true,
        promotionalOffers: false,
        serviceUpdates: true
      }
    }

    // Merge with user's actual preferences
    const userPreferences = userProfile?.preferences || {}
    const settings = {
      notifications: {
        email: userProfile?.email_notifications ?? defaultSettings.notifications.email,
        sms: userProfile?.sms_notifications ?? defaultSettings.notifications.sms,
        push: userPreferences.push_notifications ?? defaultSettings.notifications.push,
        marketing: userProfile?.marketing_emails ?? defaultSettings.notifications.marketing
      },
      preferences: {
        theme: userPreferences.theme || defaultSettings.preferences.theme,
        language: userPreferences.language || defaultSettings.preferences.language,
        timezone: userPreferences.timezone || defaultSettings.preferences.timezone,
        currency: userPreferences.currency || defaultSettings.preferences.currency,
        dateFormat: userPreferences.date_format || defaultSettings.preferences.dateFormat,
        timeFormat: userPreferences.time_format || defaultSettings.preferences.timeFormat
      },
      privacy: {
        profileVisibility: userPreferences.profile_visibility || defaultSettings.privacy.profileVisibility,
        shareData: userPreferences.share_data ?? defaultSettings.privacy.shareData,
        analytics: userPreferences.analytics ?? defaultSettings.privacy.analytics
      },
      communication: {
        preferredContact: userPreferences.preferred_contact || defaultSettings.communication.preferredContact,
        bookingReminders: userPreferences.booking_reminders ?? defaultSettings.communication.bookingReminders,
        promotionalOffers: userPreferences.promotional_offers ?? defaultSettings.communication.promotionalOffers,
        serviceUpdates: userPreferences.service_updates ?? defaultSettings.communication.serviceUpdates
      }
    }

    console.log('✅ Successfully fetched user settings:', {
      userId: user.id,
      hasCustomPreferences: Object.keys(userPreferences).length > 0
    })

    return NextResponse.json({ data: settings })

  } catch (error) {
    console.error('User settings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notifications, preferences, privacy, communication } = body

    // Use service role to update user settings
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('💾 Updating settings for user:', user.id)

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Update notification settings
    if (notifications) {
      updateData.email_notifications = notifications.email
      updateData.sms_notifications = notifications.sms
      updateData.marketing_emails = notifications.marketing
    }

    // Update preferences as JSON
    if (preferences || privacy || communication) {
      const currentPreferences = await serviceSupabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      const existingPreferences = currentPreferences.data?.preferences || {}
      
      updateData.preferences = {
        ...existingPreferences,
        ...(preferences && {
          theme: preferences.theme,
          language: preferences.language,
          timezone: preferences.timezone,
          currency: preferences.currency,
          date_format: preferences.dateFormat,
          time_format: preferences.timeFormat
        }),
        ...(privacy && {
          profile_visibility: privacy.profileVisibility,
          share_data: privacy.shareData,
          analytics: privacy.analytics
        }),
        ...(communication && {
          preferred_contact: communication.preferredContact,
          booking_reminders: communication.bookingReminders,
          promotional_offers: communication.promotionalOffers,
          service_updates: communication.serviceUpdates
        }),
        ...(notifications && {
          push_notifications: notifications.push
        })
      }
    }

    // Update user settings
    const { data: updatedSettings, error: updateError } = await serviceSupabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user settings:', updateError)
      return NextResponse.json({ error: 'Failed to update user settings' }, { status: 500 })
    }

    console.log('✅ Successfully updated user settings:', {
      userId: user.id,
      updatedFields: Object.keys(updateData)
    })

    return NextResponse.json({ 
      data: updatedSettings,
      message: 'Settings updated successfully' 
    })

  } catch (error) {
    console.error('User settings update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}