import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import EmailService, { BookingEmailData, LoyaltyEmailData, EmailType } from '@/lib/services/email'

// Email sending API endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('📧 Email send API called')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { emailType, data: emailData } = body

    if (!emailType || !emailData) {
      return NextResponse.json(
        { error: 'Email type and data are required' },
        { status: 400 }
      )
    }

    console.log('📧 Processing email request:', { type: emailType })

    let result
    
    switch (emailType as EmailType) {
      case 'booking_confirmation':
        result = await EmailService.sendBookingConfirmation(emailData as BookingEmailData)
        break
        
      case 'booking_reminder':
        result = await EmailService.sendBookingReminder(emailData as BookingEmailData)
        break
        
      case 'welcome_bonus':
        result = await EmailService.sendWelcomeBonus(emailData as LoyaltyEmailData)
        break
        
      case 'points_earned':
        result = await EmailService.sendPointsEarned(emailData as LoyaltyEmailData)
        break
        
      case 'tier_upgrade':
        result = await EmailService.sendTierUpgrade(emailData as LoyaltyEmailData)
        break
        
      default:
        return NextResponse.json(
          { error: `Unsupported email type: ${emailType}` },
          { status: 400 }
        )
    }

    if (result.success) {
      console.log('✅ Email sent successfully:', { type: emailType, messageId: result.messageId })
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId 
      })
    } else {
      console.error('❌ Email sending failed:', { type: emailType, error: result.error })
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Email preferences API
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

    return NextResponse.json({ preferences })

  } catch (error) {
    console.error('❌ Email preferences GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}