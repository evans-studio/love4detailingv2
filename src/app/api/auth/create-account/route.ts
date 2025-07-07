import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const CreateAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  bookingId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, bookingId } = CreateAccountSchema.parse(body)

    const supabase = createRouteHandlerClient({ cookies })

    // First, verify the booking exists and matches the email
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('customer_email, customer_name, customer_phone')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Invalid booking reference' },
        { status: 400 }
      )
    }

    if (booking.customer_email !== email) {
      return NextResponse.json(
        { error: 'Email does not match booking' },
        { status: 400 }
      )
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: booking.customer_name,
          phone: booking.customer_phone
        }
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create the user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: booking.customer_name,
        phone: booking.customer_phone,
        role: 'customer',
        is_active: true,
        email_verified_at: null,
        preferred_communication: 'email',
        marketing_opt_in: false
      })

    if (profileError) {
      // If profile creation fails, we should ideally clean up the auth user
      // but for now we'll just log the error
      console.error('Failed to create user profile:', profileError)
    }

    // Update the booking to link it to the user
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ user_id: authData.user.id })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Failed to link booking to user:', updateError)
    }

    // Create initial customer rewards record
    const { error: rewardsError } = await supabase
      .from('customer_rewards')
      .insert({
        user_id: authData.user.id,
        customer_email: email,
        total_points: 0,
        points_pending: 0,
        points_lifetime: 0,
        current_tier: 'bronze',
        tier_progress: 0
      })

    if (rewardsError) {
      console.error('Failed to create rewards record:', rewardsError)
    }

    // Create welcome reward transaction
    try {
      await supabase.rpc('add_welcome_bonus', {
        p_user_id: authData.user.id,
        p_points: 100
      })
    } catch (error) {
      console.error('Failed to add welcome bonus:', error)
    }

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
      message: 'Account created successfully'
    })

  } catch (error) {
    console.error('Create account error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}