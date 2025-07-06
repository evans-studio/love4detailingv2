import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Three-tier rewards system as specified in audit
const REWARDS_TIERS = {
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    min_points: 0,
    max_points: 499,
    benefits: ['Full Valet Service'],
    discount_percentage: 0,
    icon: '🥉',
    color: '#CD7F32',
    bgColor: '#FFF8E1'
  },
  silver: {
    id: 'silver', 
    name: 'Silver',
    min_points: 500,
    max_points: 999,
    benefits: ['10% discount', 'Priority booking'],
    discount_percentage: 10,
    icon: '🥈',
    color: '#C0C0C0',
    bgColor: '#F5F5F5'
  },
  gold: {
    id: 'gold',
    name: 'Gold', 
    min_points: 1000,
    max_points: Infinity,
    benefits: ['15% discount', 'VIP treatment', 'Priority booking'],
    discount_percentage: 15,
    icon: '🥇',
    color: '#FFD700',
    bgColor: '#FFFDE7'
  }
};

const POINTS_CONFIG = {
  per_booking: 100,
  per_referral: 250,
  expiry_months: 12
};

// Get user rewards data
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's current points and transactions
    const [pointsResult, transactionsResult] = await Promise.all([
      supabaseServiceRole
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      
      supabaseServiceRole
        .from('reward_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    // Calculate current tier
    const currentPoints = pointsResult.data?.current_points || 0;
    const lifetimePoints = pointsResult.data?.lifetime_points || 0;
    
    let currentTier = REWARDS_TIERS.bronze;
    if (currentPoints >= REWARDS_TIERS.gold.min_points) {
      currentTier = REWARDS_TIERS.gold;
    } else if (currentPoints >= REWARDS_TIERS.silver.min_points) {
      currentTier = REWARDS_TIERS.silver;
    }

    // Calculate next tier progress
    let nextTier = null;
    let pointsToNextTier = 0;
    
    if (currentTier.id === 'bronze') {
      nextTier = REWARDS_TIERS.silver;
      pointsToNextTier = REWARDS_TIERS.silver.min_points - currentPoints;
    } else if (currentTier.id === 'silver') {
      nextTier = REWARDS_TIERS.gold;
      pointsToNextTier = REWARDS_TIERS.gold.min_points - currentPoints;
    }

    // Get user's completed bookings count for additional stats
    const { data: bookings, count: completedBookings } = await supabaseServiceRole
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const rewardsData = {
      user_id: user.id,
      current_points: currentPoints,
      lifetime_points: lifetimePoints,
      current_tier: currentTier,
      next_tier: nextTier,
      points_to_next_tier: pointsToNextTier,
      all_tiers: Object.values(REWARDS_TIERS),
      points_config: POINTS_CONFIG,
      transactions: transactionsResult.data || [],
      stats: {
        completed_bookings: completedBookings || 0,
        referrals_made: transactionsResult.data?.filter(t => t.transaction_type === 'earned' && t.description?.includes('referral')).length || 0
      }
    };

    return NextResponse.json({
      success: true,
      rewards: rewardsData
    });

  } catch (error) {
    console.error('Rewards API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards data' },
      { status: 500 }
    );
  }
}

// Award points for completed booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, transaction_type, points, description, booking_id } = body;

    // Validate required fields
    if (!user_id || !transaction_type || !points) {
      return NextResponse.json(
        { error: 'user_id, transaction_type, and points are required' },
        { status: 400 }
      );
    }

    // Start transaction to update points and create transaction record
    const now = new Date().toISOString();

    // Get current points or create new record
    let { data: currentPointsData, error: pointsError } = await supabaseServiceRole
      .from('loyalty_points')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') { // Not found error is ok
      return NextResponse.json(
        { error: 'Failed to fetch current points', details: pointsError.message },
        { status: 500 }
      );
    }

    let currentPoints = 0;
    let lifetimePoints = 0;

    if (currentPointsData) {
      currentPoints = currentPointsData.current_points;
      lifetimePoints = currentPointsData.lifetime_points;
    }

    // Calculate new points based on transaction type
    let newCurrentPoints = currentPoints;
    let newLifetimePoints = lifetimePoints;

    if (transaction_type === 'earned') {
      newCurrentPoints += points;
      newLifetimePoints += points;
    } else if (transaction_type === 'redeemed') {
      newCurrentPoints = Math.max(0, newCurrentPoints - points);
    } else if (transaction_type === 'expired') {
      newCurrentPoints = Math.max(0, newCurrentPoints - points);
    }

    // Update or insert loyalty points
    const { error: updatePointsError } = await supabaseServiceRole
      .from('loyalty_points')
      .upsert({
        user_id,
        current_points: newCurrentPoints,
        lifetime_points: newLifetimePoints,
        updated_at: now
      });

    if (updatePointsError) {
      return NextResponse.json(
        { error: 'Failed to update points', details: updatePointsError.message },
        { status: 500 }
      );
    }

    // Create transaction record
    const { error: transactionError } = await supabaseServiceRole
      .from('reward_transactions')
      .insert({
        user_id,
        transaction_type,
        points,
        description: description || `${transaction_type} ${points} points`,
        booking_id,
        created_at: now
      });

    if (transactionError) {
      return NextResponse.json(
        { error: 'Failed to create transaction record', details: transactionError.message },
        { status: 500 }
      );
    }

    // Determine new tier
    let newTier = REWARDS_TIERS.bronze;
    if (newCurrentPoints >= REWARDS_TIERS.gold.min_points) {
      newTier = REWARDS_TIERS.gold;
    } else if (newCurrentPoints >= REWARDS_TIERS.silver.min_points) {
      newTier = REWARDS_TIERS.silver;
    }

    return NextResponse.json({
      success: true,
      message: 'Points updated successfully',
      data: {
        current_points: newCurrentPoints,
        lifetime_points: newLifetimePoints,
        points_change: transaction_type === 'earned' ? points : -points,
        new_tier: newTier
      }
    });

  } catch (error) {
    console.error('Points update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate tier progression
function calculateTierProgression(currentPoints: number) {
  const tiers = Object.values(REWARDS_TIERS);
  
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (currentPoints >= tier.min_points && currentPoints <= tier.max_points) {
      const nextTier = tiers[i + 1] || null;
      const pointsToNext = nextTier ? nextTier.min_points - currentPoints : 0;
      
      return {
        current_tier: tier,
        next_tier: nextTier,
        points_to_next_tier: pointsToNext,
        progress_percentage: nextTier ? 
          ((currentPoints - tier.min_points) / (nextTier.min_points - tier.min_points)) * 100 : 100
      };
    }
  }
  
  return {
    current_tier: REWARDS_TIERS.bronze,
    next_tier: REWARDS_TIERS.silver,
    points_to_next_tier: REWARDS_TIERS.silver.min_points - currentPoints,
    progress_percentage: 0
  };
}