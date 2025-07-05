import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { RewardsTier, UserRewards } from '@/types';
import { EmailService } from './email';

// This would typically come from a config file
const REWARDS_CONFIG = {
  tiers: {
    bronze: {
      name: 'Bronze',
      minPoints: 0,
      maxPoints: 499,
      benefits: [
        'Early access to promotions',
        'Birthday bonus points',
        'Monthly newsletter',
      ],
      icon: '🥉',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
    silver: {
      name: 'Silver',
      minPoints: 500,
      maxPoints: 999,
      benefits: [
        'All Bronze benefits',
        '10% off selected services',
        'Priority booking',
        'Quarterly detail inspection',
      ],
      icon: '🥈',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    gold: {
      name: 'Gold',
      minPoints: 1000,
      maxPoints: Infinity,
      benefits: [
        'All Silver benefits',
        '15% off all services',
        'VIP parking',
        'Annual full detail',
        'Dedicated account manager',
      ],
      icon: '🥇',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  },
  pointsPerBooking: 100,
  pointsPerReferral: 250,
  pointsForReview: 50,
};

export class RewardsService {
  private supabase = createClientComponentClient();
  private emailService = new EmailService();

  /**
   * Get user's current rewards status
   */
  async getUserRewards(user_id: string): Promise<UserRewards | null> {
    const { data: rewards, error } = await this.supabase
      .from('rewards')
      .select(`
        *,
        reward_transactions (*)
      `)
      .eq('user_id', user_id)
      .single();

    if (error || !rewards) return null;

    const tier = this.calculateTier(rewards.points) as keyof typeof REWARDS_CONFIG.tiers;
    const tierConfig = REWARDS_CONFIG.tiers[tier];

    return {
      user_id: rewards.user_id,
      currentPoints: rewards.points,
      lifetimePoints: rewards.points, // We don't track lifetime points separately yet
      availableRewards: 0, // We don't have a rewards redemption system yet
      currentTier: {
        id: tier,
        name: tierConfig.name,
        points: tierConfig.minPoints,
        benefits: tierConfig.benefits,
        icon: tierConfig.icon,
        color: tierConfig.color,
        bgColor: tierConfig.bgColor
      },
      rewardsHistory: rewards.reward_transactions
    };
  }

  /**
   * Calculate user's tier based on points
   */
  private calculateTier(points: number): string {
    if (points >= REWARDS_CONFIG.tiers.gold.minPoints) return 'gold';
    if (points >= REWARDS_CONFIG.tiers.silver.minPoints) return 'silver';
    return 'bronze';
  }

  /**
   * Get tier details
   */
  getTierDetails(tier: string): RewardsTier {
    const tierConfig = REWARDS_CONFIG.tiers[tier as keyof typeof REWARDS_CONFIG.tiers];
    return {
      id: tier,
      name: tierConfig.name,
      points: tierConfig.minPoints,
      benefits: tierConfig.benefits,
      icon: tierConfig.icon,
      color: tierConfig.color,
      bgColor: tierConfig.bgColor
    };
  }

  /**
   * Add points for a booking
   */
  async addBookingPoints(user_id: string, booking_id: string): Promise<void> {
    await this.addPoints(user_id, booking_id, REWARDS_CONFIG.pointsPerBooking, 'Booking completed');
  }

  /**
   * Add points for a referral
   */
  async addReferralPoints(user_id: string, referred_booking_id: string): Promise<void> {
    await this.addPoints(
      user_id,
      referred_booking_id,
      REWARDS_CONFIG.pointsPerReferral,
      'Successful referral'
    );
  }

  /**
   * Add points for a review
   */
  async addReviewPoints(user_id: string, booking_id: string): Promise<void> {
    await this.addPoints(
      user_id,
      booking_id,
      REWARDS_CONFIG.pointsForReview,
      'Review submitted'
    );
  }

  /**
   * Add points to user's account
   */
  private async addPoints(
    user_id: string,
    booking_id: string,
    points: number,
    description: string
  ): Promise<void> {
    const { data: existingRewards } = await this.supabase
      .from('rewards')
      .select('points')
      .eq('user_id', user_id)
      .single();

    const currentPoints = existingRewards?.points || 0;
    const newPoints = currentPoints + points;

    // Start a transaction
    const { error: rewardsError } = await this.supabase
      .from('rewards')
      .upsert({
        user_id,
        points: newPoints,
        updated_at: new Date().toISOString(),
      });

    if (rewardsError) throw rewardsError;

    const { error: transactionError } = await this.supabase
      .from('reward_transactions')
      .insert({
        user_id,
        booking_id,
        points,
        type: 'earned',
        description,
        created_at: new Date().toISOString(),
      });

    if (transactionError) throw transactionError;

    // Check if user has reached a new tier
    const oldTier = this.calculateTier(currentPoints);
    const newTier = this.calculateTier(newPoints);

    if (newTier !== oldTier) {
      // Get user's email
      const { data: user } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', user_id)
        .single();

      if (user?.email) {
        await this.emailService.sendTierUpgradeNotification(
          user_id,
          user.email,
          oldTier,
          newTier,
          newPoints
        );
      }
    }
  }

  /**
   * Get points needed for next tier
   */
  getPointsNeededForNextTier(points: number): {
    nextTier: string | null;
    pointsNeeded: number;
  } {
    const currentTier = this.calculateTier(points);

    if (currentTier === 'bronze') {
      return {
        nextTier: 'silver',
        pointsNeeded: REWARDS_CONFIG.tiers.silver.minPoints - points,
      };
    }

    if (currentTier === 'silver') {
      return {
        nextTier: 'gold',
        pointsNeeded: REWARDS_CONFIG.tiers.gold.minPoints - points,
      };
    }

    return {
      nextTier: null,
      pointsNeeded: 0,
    };
  }

  /**
   * Get all tiers
   */
  getAllTiers(): RewardsTier[] {
    return Object.entries(REWARDS_CONFIG.tiers).map(([tier, config]) => ({
      id: tier,
      name: config.name,
      points: config.minPoints,
      benefits: config.benefits,
      icon: config.icon,
      color: config.color,
      bgColor: config.bgColor
    }));
  }
} 