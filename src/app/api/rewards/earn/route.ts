import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Points Earning API
 * Handles automatic points earning for various customer actions
 */

// Points earning configuration
const EARNING_RULES = {
  booking_completed: {
    base_points: 50,
    per_pound_spent: 1,
    description: 'Booking completion bonus'
  },
  first_booking: {
    bonus_points: 100,
    description: 'Welcome bonus for first booking'
  },
  loyalty_milestone: {
    every_bookings: 10,
    bonus_points: 100,
    description: 'Loyalty milestone bonus'
  },
  review_submitted: {
    bonus_points: 25,
    description: 'Review submission bonus'
  },
  referral_success: {
    bonus_points: 200,
    description: 'Successful referral bonus'
  }
}

function calculateTierFromPoints(points: number): string {
  if (points >= 2000) return 'platinum'
  if (points >= 1000) return 'gold'
  if (points >= 500) return 'silver'
  return 'bronze'
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Points earning API called')
    
    const supabase = createServerSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      action, 
      booking_id, 
      amount_spent_pence, 
      is_first_booking = false,
      additional_description 
    } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get or create customer rewards record
    let { data: rewardsData, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (rewardsError && rewardsError.code === 'PGRST116') {
      // Create new rewards record
      const { data: newRewards, error: createError } = await serviceSupabase
        .from('customer_rewards')
        .insert([{
          user_id: user.id,
          customer_email: user.email,
          total_points: 0,
          points_lifetime: 0,
          current_tier: 'bronze',
          created_at: new Date().toISOString()
        }])
        .select('*')
        .single()

      if (createError) {
        console.error('Error creating rewards record:', createError)
        return NextResponse.json(
          { error: 'Failed to create rewards record' },
          { status: 500 }
        )
      }
      
      rewardsData = newRewards
    } else if (rewardsError) {
      console.error('Error fetching rewards data:', rewardsError)
      return NextResponse.json(
        { error: 'Failed to fetch rewards data' },
        { status: 500 }
      )
    }

    let pointsToEarn = 0
    let transactions = []

    // Calculate points based on action
    switch (action) {
      case 'booking_completed':
        // Base completion bonus
        pointsToEarn += EARNING_RULES.booking_completed.base_points
        transactions.push({
          customer_reward_id: rewardsData.id,
          booking_id: booking_id,
          transaction_type: 'earned',
          points_amount: EARNING_RULES.booking_completed.base_points,
          description: EARNING_RULES.booking_completed.description,
          created_at: new Date().toISOString()
        })

        // Points per pound spent
        if (amount_spent_pence && amount_spent_pence > 0) {
          const spendingPoints = Math.round(amount_spent_pence / 100)
          pointsToEarn += spendingPoints
          transactions.push({
            customer_reward_id: rewardsData.id,
            booking_id: booking_id,
            transaction_type: 'earned',
            points_amount: spendingPoints,
            description: `Earned ${spendingPoints} points (£${(amount_spent_pence / 100).toFixed(2)} spent)`,
            created_at: new Date().toISOString()
          })
        }

        // First booking bonus
        if (is_first_booking) {
          pointsToEarn += EARNING_RULES.first_booking.bonus_points
          transactions.push({
            customer_reward_id: rewardsData.id,
            booking_id: booking_id,
            transaction_type: 'earned',
            points_amount: EARNING_RULES.first_booking.bonus_points,
            description: EARNING_RULES.first_booking.description,
            created_at: new Date().toISOString()
          })
        }

        // Check for loyalty milestone
        const { data: totalBookings } = await serviceSupabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')

        const bookingCount = totalBookings?.length || 0
        if (bookingCount > 0 && bookingCount % EARNING_RULES.loyalty_milestone.every_bookings === 0) {
          pointsToEarn += EARNING_RULES.loyalty_milestone.bonus_points
          transactions.push({
            customer_reward_id: rewardsData.id,
            booking_id: booking_id,
            transaction_type: 'earned',
            points_amount: EARNING_RULES.loyalty_milestone.bonus_points,
            description: `${EARNING_RULES.loyalty_milestone.description} (${bookingCount} bookings)`,
            created_at: new Date().toISOString()
          })
        }
        break

      case 'review_submitted':
        pointsToEarn = EARNING_RULES.review_submitted.bonus_points
        transactions.push({
          customer_reward_id: rewardsData.id,
          booking_id: booking_id,
          transaction_type: 'earned',
          points_amount: pointsToEarn,
          description: EARNING_RULES.review_submitted.description,
          created_at: new Date().toISOString()
        })
        break

      case 'referral_success':
        pointsToEarn = EARNING_RULES.referral_success.bonus_points
        transactions.push({
          customer_reward_id: rewardsData.id,
          transaction_type: 'earned',
          points_amount: pointsToEarn,
          description: EARNING_RULES.referral_success.description,
          created_at: new Date().toISOString()
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Calculate new totals
    const currentPoints = rewardsData.total_points || 0
    const newTotal = currentPoints + pointsToEarn
    const newLifetimePoints = Math.max(rewardsData.points_lifetime || 0, newTotal)
    const newTier = calculateTierFromPoints(newTotal)

    // Update rewards record
    const { error: updateError } = await serviceSupabase
      .from('customer_rewards')
      .update({
        total_points: newTotal,
        points_lifetime: newLifetimePoints,
        current_tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating rewards:', updateError)
      return NextResponse.json(
        { error: 'Failed to update rewards' },
        { status: 500 }
      )
    }

    // Create transaction records
    if (transactions.length > 0) {
      const { error: transactionError } = await serviceSupabase
        .from('reward_transactions')
        .insert(transactions)

      if (transactionError) {
        console.error('Error creating transactions:', transactionError)
        // Continue without failing the main operation
      }
    }

    // Check for tier upgrade
    const oldTier = rewardsData.current_tier || 'bronze'
    const tierUpgraded = newTier !== oldTier

    const response = {
      success: true,
      points_earned: pointsToEarn,
      new_total: newTotal,
      old_tier: oldTier,
      new_tier: newTier,
      tier_upgraded: tierUpgraded,
      transactions: transactions.length,
      message: `Earned ${pointsToEarn} points!${tierUpgraded ? ` Congratulations! You've been upgraded to ${newTier} tier!` : ''}`
    }

    console.log('✅ Points earned successfully')
    return NextResponse.json({
      data: response,
      error: null
    })

  } catch (error) {
    console.error('💥 Error in points earning API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}