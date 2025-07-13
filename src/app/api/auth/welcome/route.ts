import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import EmailService, { LoyaltyEmailData } from '@/lib/services/email'

// POST route to send welcome email for new users
export async function POST(request: NextRequest) {
  try {
    console.log('🎉 Welcome email API called')
    
    const body = await request.json()
    const { user_id, user_email, full_name } = body

    if (!user_id || !user_email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user already received welcome email
    const { data: existingEmail } = await supabase
      .from('email_notifications')
      .select('id')
      .eq('user_id', user_id)
      .eq('email_type', 'welcome_bonus')
      .single()

    if (existingEmail) {
      console.log('ℹ️ Welcome email already sent for user:', user_id)
      return NextResponse.json({ 
        success: true, 
        message: 'Welcome email already sent' 
      })
    }

    // Award welcome bonus points (50 points)
    const welcomePoints = 50
    
    try {
      const { error: pointsError } = await supabase
        .from('reward_transactions')
        .insert({
          user_id: user_id,
          transaction_type: 'earned',
          points: welcomePoints,
          description: 'Welcome bonus points',
          created_at: new Date().toISOString()
        })

      if (pointsError) {
        console.error('❌ Error awarding welcome points:', pointsError)
        // Continue with email even if points fail
      } else {
        console.log('✅ Welcome bonus points awarded:', { user_id, points: welcomePoints })
      }
    } catch (pointsError) {
      console.error('❌ Error in points transaction:', pointsError)
      // Continue with email even if points fail
    }

    // Send welcome email
    const emailData: LoyaltyEmailData = {
      customer_name: full_name || 'Valued Customer',
      customer_email: user_email,
      points_earned: welcomePoints,
      total_points: welcomePoints,
      tier: 'Bronze'
    }

    const emailResult = await EmailService.sendWelcomeBonus(emailData)

    if (emailResult.success) {
      // Log the email notification
      await supabase
        .from('email_notifications')
        .insert({
          user_id: user_id,
          email_type: 'welcome_bonus',
          email_address: user_email,
          subject: 'Welcome to Love4Detailing! Your 50 Bonus Points Await',
          delivery_status: 'delivered',
          resend_message_id: emailResult.messageId
        })

      console.log('✅ Welcome email sent successfully:', { user_id, email: user_email })
      
      return NextResponse.json({ 
        success: true,
        message: 'Welcome email sent successfully',
        messageId: emailResult.messageId
      })
    } else {
      console.error('❌ Failed to send welcome email:', emailResult.error)
      
      return NextResponse.json({
        error: 'Failed to send welcome email',
        details: emailResult.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Welcome email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET route to check welcome email status
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

    const { data: welcomeEmail, error } = await supabase
      .from('email_notifications')
      .select('id, sent_at, delivery_status')
      .eq('user_id', userId)
      .eq('email_type', 'welcome_bonus')
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check welcome email status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      welcome_email_sent: !!welcomeEmail,
      email_details: welcomeEmail || null
    })

  } catch (error) {
    console.error('❌ Welcome email status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}