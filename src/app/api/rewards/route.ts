import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Comprehensive Rewards System API
 * Handles customer rewards, loyalty tiers, and discount calculations
 */

// Reward tier configuration
const REWARD_TIERS = {
  bronze: {
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 499,
    discountPercentage: 5,
    benefits: [
      '5% service discount',
      'Priority booking reminders',
      'Service care tips'
    ]
  },
  silver: {
    name: 'Silver',
    minPoints: 500,
    maxPoints: 999,
    discountPercentage: 10,
    benefits: [
      '10% service discount',
      'Free car air freshener',
      'Monthly care tips',
      'Priority support'
    ]
  },
  gold: {
    name: 'Gold',
    minPoints: 1000,
    maxPoints: 1999,
    discountPercentage: 15,
    benefits: [
      '15% service discount',
      'Free premium wax upgrade',
      'VIP booking slots',
      'Personal detailer preference',
      'Birthday bonus points'
    ]
  },
  platinum: {
    name: 'Platinum',
    minPoints: 2000,
    maxPoints: Infinity,
    discountPercentage: 20,
    benefits: [
      '20% service discount',
      'Free interior protection',
      'Express booking priority',
      'Personal account manager',
      'Exclusive seasonal offers'
    ]
  }
}

// Points earning rates
const POINTS_EARNING = {
  per_pound_spent: 1,        // 1 point per £1 spent
  booking_completion: 50,    // 50 bonus points per completed booking
  first_booking: 100,        // 100 bonus points for first booking
  referral: 200,            // 200 points for successful referral
  review_bonus: 25,         // 25 points for leaving a review
  loyalty_bonus: 100        // 100 points for every 10 bookings
}

function calculateTierFromPoints(points: number): string {
  if (points >= REWARD_TIERS.platinum.minPoints) return 'platinum'
  if (points >= REWARD_TIERS.gold.minPoints) return 'gold'
  if (points >= REWARD_TIERS.silver.minPoints) return 'silver'
  return 'bronze'
}

function calculateTierProgress(points: number, currentTier: string): number {
  const tier = REWARD_TIERS[currentTier as keyof typeof REWARD_TIERS]
  if (!tier || tier.maxPoints === Infinity) return 100
  
  const progress = ((points - tier.minPoints) / (tier.maxPoints - tier.minPoints)) * 100
  return Math.min(100, Math.max(0, progress))
}

function calculatePointsToNextTier(points: number, currentTier: string): number {
  const tiers = Object.keys(REWARD_TIERS)
  const currentIndex = tiers.indexOf(currentTier)
  
  if (currentIndex === -1 || currentIndex === tiers.length - 1) return 0
  
  const nextTierKey = tiers[currentIndex + 1]
  const nextTier = REWARD_TIERS[nextTierKey as keyof typeof REWARD_TIERS]
  
  return Math.max(0, nextTier.minPoints - points)
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎁 Rewards API called')
    
    const supabase = createServerSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.id, user.email)

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get or create customer rewards record
    let { data: rewardsData, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select(`
        id,
        total_points,
        points_lifetime,
        points_pending,
        current_tier,
        tier_progress,
        customer_email,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .single()

    // If no rewards record exists, create one
    if (rewardsError && rewardsError.code === 'PGRST116') {
      console.log('📝 Creating new rewards record for user')
      const { data: newRewards, error: createError } = await serviceSupabase
        .from('customer_rewards')
        .insert([{
          user_id: user.id,
          customer_email: user.email,
          total_points: 0,
          points_lifetime: 0,
          points_pending: 0,
          current_tier: 'bronze',
          tier_progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating rewards record:', createError)
        return NextResponse.json(
          { error: 'Failed to create rewards record' },
          { status: 500 }
        )
      }
      
      rewardsData = newRewards
    } else if (rewardsError) {
      console.error('❌ Error fetching rewards data:', rewardsError)
      return NextResponse.json(
        { error: 'Failed to fetch rewards data' },
        { status: 500 }
      )
    }

    // Calculate current status
    const totalPoints = rewardsData?.total_points || 0
    const currentTier = calculateTierFromPoints(totalPoints)
    const tierProgress = calculateTierProgress(totalPoints, currentTier)
    const pointsToNextTier = calculatePointsToNextTier(totalPoints, currentTier)
    
    // Get next tier info
    const tiers = Object.keys(REWARD_TIERS)
    const currentIndex = tiers.indexOf(currentTier)
    const nextTierKey = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null
    
    // Get recent reward transactions
    const { data: transactions, error: transactionsError } = await serviceSupabase
      .from('reward_transactions')
      .select(`
        id,
        booking_id,
        transaction_type,
        points_amount,
        description,
        created_at,
        expires_at
      `)
      .eq('customer_reward_id', rewardsData?.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (transactionsError) {
      console.error('❌ Error fetching reward transactions:', transactionsError)
      // Continue without transactions rather than failing
    }

    // Get current tier benefits
    const currentTierConfig = REWARD_TIERS[currentTier as keyof typeof REWARD_TIERS]
    
    // Format response
    const response = {
      user_id: user.id,
      total_points: totalPoints,
      available_points: totalPoints, // For now, all points are available
      current_tier: currentTier,
      tier_progress: tierProgress,
      points_to_next_tier: pointsToNextTier,
      next_tier: nextTierKey,
      lifetime_points: rewardsData?.points_lifetime || totalPoints,
      discount_percentage: currentTierConfig.discountPercentage,
      tier_benefits: currentTierConfig.benefits,
      recent_transactions: (transactions || []).map((t: any) => ({
        id: t.id,
        type: t.transaction_type,
        points: t.points_amount,
        description: t.description,
        date: t.created_at,
        booking_reference: t.booking_id ? `#${t.booking_id.slice(-6)}` : null
      })),
      earning_rates: POINTS_EARNING,
      tier_configuration: REWARD_TIERS
    }

    console.log('✅ Rewards data calculated successfully')
    return NextResponse.json({
      data: response,
      error: null
    })

  } catch (error) {
    console.error('💥 Error in rewards API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎁 Rewards POST API called')
    
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
    const { action, points, description, booking_id, transaction_type } = body

    if (!action || !points || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: action, points, description' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get customer rewards record
    const { data: rewardsData, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (rewardsError) {
      console.error('❌ Error fetching rewards data:', rewardsError)
      return NextResponse.json(
        { error: 'Failed to fetch rewards data' },
        { status: 500 }
      )
    }

    // Calculate new points total
    const currentPoints = rewardsData.total_points || 0
    const pointsChange = action === 'earn' ? points : -points
    const newTotal = Math.max(0, currentPoints + pointsChange)
    
    // Calculate new tier and progress
    const newTier = calculateTierFromPoints(newTotal)
    const newProgress = calculateTierProgress(newTotal, newTier)
    
    // Update customer rewards
    const { error: updateError } = await serviceSupabase
      .from('customer_rewards')
      .update({
        total_points: newTotal,
        points_lifetime: Math.max(rewardsData.points_lifetime || 0, newTotal),
        current_tier: newTier,
        tier_progress: newProgress,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('❌ Error updating rewards:', updateError)
      return NextResponse.json(
        { error: 'Failed to update rewards' },
        { status: 500 }
      )
    }

    // Create transaction record
    const { error: transactionError } = await serviceSupabase
      .from('reward_transactions')
      .insert([{
        customer_reward_id: rewardsData.id,
        booking_id: booking_id || null,
        transaction_type: transaction_type || (action === 'earn' ? 'earned' : 'redeemed'),
        points_amount: Math.abs(pointsChange),
        description: description,
        created_at: new Date().toISOString()
      }])

    if (transactionError) {
      console.error('❌ Error creating transaction:', transactionError)
      // Continue without failing the main operation
    }

    console.log('✅ Rewards updated successfully')
    return NextResponse.json({
      data: {
        success: true,
        new_total: newTotal,
        new_tier: newTier,
        points_change: pointsChange,
        message: `${action === 'earn' ? 'Earned' : 'Redeemed'} ${Math.abs(pointsChange)} points`
      },
      error: null
    })

  } catch (error) {
    console.error('💥 Error in rewards POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}