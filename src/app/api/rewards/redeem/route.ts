import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Rewards Redeem API Route
 * Handles redeeming customer rewards for benefits
 */

export async function POST(request: NextRequest) {
  try {
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
    const { reward_id } = body

    if (!reward_id) {
      return NextResponse.json(
        { error: 'Reward ID is required' },
        { status: 400 }
      )
    }

    // Define available rewards with their costs
    const REWARD_BENEFITS = {
      '1': { name: 'Free Car Air Freshener', cost: 100, description: 'Premium car air freshener with next service' },
      '2': { name: 'Service Upgrade', cost: 200, description: 'Upgrade to premium service package' },
      '3': { name: 'Free Premium Wax', cost: 300, description: 'Professional ceramic wax application' },
      '4': { name: '20% Service Discount', cost: 400, description: 'One-time 20% discount on any service' }
    }

    const reward = REWARD_BENEFITS[reward_id as keyof typeof REWARD_BENEFITS]
    if (!reward) {
      return NextResponse.json(
        { error: 'Invalid reward ID' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current user rewards
    const { data: currentRewards, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select('id, total_points, current_tier')
      .eq('user_id', user.id)
      .single()

    if (rewardsError) {
      console.error('Error fetching current rewards:', rewardsError)
      return NextResponse.json(
        { error: 'Failed to fetch current rewards' },
        { status: 500 }
      )
    }

    // Check if user has enough points
    const availablePoints = currentRewards?.total_points || 0
    if (availablePoints < reward.cost) {
      return NextResponse.json(
        { error: 'Insufficient points for this reward' },
        { status: 400 }
      )
    }

    // Create redemption transaction
    const { error: transactionError } = await serviceSupabase
      .from('reward_transactions')
      .insert([{
        customer_reward_id: currentRewards.id,
        transaction_type: 'redeemed',
        points_amount: reward.cost,
        description: `Redeemed: ${reward.name}`,
        created_at: new Date().toISOString()
      }])

    if (transactionError) {
      console.error('Error creating redemption transaction:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create redemption transaction' },
        { status: 500 }
      )
    }

    // Update user's available points
    const { error: updateError } = await serviceSupabase
      .from('customer_rewards')
      .update({ 
        total_points: availablePoints - reward.cost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating user rewards:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user rewards' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        success: true,
        reward_redeemed: reward.name,
        points_used: reward.cost,
        remaining_points: availablePoints - reward.cost
      },
      error: null
    })

  } catch (error) {
    console.error('Error in rewards redeem API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}