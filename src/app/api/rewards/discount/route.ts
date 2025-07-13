import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Rewards Discount API
 * Calculates discounts based on user's reward tier and applies them to bookings
 */

// Reward tier discount configuration
const TIER_DISCOUNTS = {
  bronze: 5,
  silver: 10,
  gold: 15,
  platinum: 20
}

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Discount calculation API called')
    
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
    const { service_price_pence, apply_discount = true } = body

    if (!service_price_pence || service_price_pence <= 0) {
      return NextResponse.json(
        { error: 'Valid service price is required' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's current reward tier
    const { data: rewardsData, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select('current_tier, total_points')
      .eq('user_id', user.id)
      .single()

    let currentTier = 'bronze'
    let totalPoints = 0

    if (rewardsError && rewardsError.code === 'PGRST116') {
      // No rewards record exists, create one
      const { data: newRewards, error: createError } = await serviceSupabase
        .from('customer_rewards')
        .insert([{
          user_id: user.id,
          customer_email: user.email,
          total_points: 0,
          current_tier: 'bronze',
          created_at: new Date().toISOString()
        }])
        .select('current_tier, total_points')
        .single()

      if (!createError) {
        currentTier = newRewards.current_tier || 'bronze'
        totalPoints = newRewards.total_points || 0
      }
    } else if (!rewardsError) {
      currentTier = rewardsData.current_tier || 'bronze'
      totalPoints = rewardsData.total_points || 0
    }

    // Calculate discount
    const discountPercentage = apply_discount ? (TIER_DISCOUNTS[currentTier as keyof typeof TIER_DISCOUNTS] || 0) : 0
    const discountAmount = Math.round((service_price_pence * discountPercentage) / 100)
    const finalPrice = service_price_pence - discountAmount

    // Calculate points that will be earned from this booking
    const pointsToEarn = Math.round(finalPrice / 100) + 50 // 1 point per £1 + 50 completion bonus

    const response = {
      original_price_pence: service_price_pence,
      discount_percentage: discountPercentage,
      discount_amount_pence: discountAmount,
      final_price_pence: finalPrice,
      current_tier: currentTier,
      current_points: totalPoints,
      points_to_earn: pointsToEarn,
      savings_info: {
        amount_saved: discountAmount,
        percentage_saved: discountPercentage,
        tier_benefit: `${discountPercentage}% ${currentTier} member discount applied`
      }
    }

    console.log('✅ Discount calculated successfully')
    return NextResponse.json({
      data: response,
      error: null
    })

  } catch (error) {
    console.error('💥 Error in discount API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's current reward tier
    const { data: rewardsData, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select('current_tier, total_points')
      .eq('user_id', user.id)
      .single()

    let currentTier = 'bronze'
    let totalPoints = 0

    if (!rewardsError) {
      currentTier = rewardsData.current_tier || 'bronze'
      totalPoints = rewardsData.total_points || 0
    }

    const discountPercentage = TIER_DISCOUNTS[currentTier as keyof typeof TIER_DISCOUNTS] || 0

    const response = {
      current_tier: currentTier,
      current_points: totalPoints,
      discount_percentage: discountPercentage,
      tier_discounts: TIER_DISCOUNTS,
      next_tier_discount: currentTier === 'platinum' ? null : TIER_DISCOUNTS[
        currentTier === 'bronze' ? 'silver' : 
        currentTier === 'silver' ? 'gold' : 'platinum'
      ]
    }

    return NextResponse.json({
      data: response,
      error: null
    })

  } catch (error) {
    console.error('Error in discount GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}