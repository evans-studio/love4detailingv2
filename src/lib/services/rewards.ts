import { createClient } from '@/lib/api/supabase';
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
  private supabase = createClient();
  private emailService = new EmailService();

  /**
   * Get user's current rewards status
   */
  async getUserRewards(userId: string): Promise<UserRewards | null> {
    const { data: rewards, error } = await this.supabase
      .from('rewards')
      .select(`
        *,
        reward_transactions (*)
      `)
      .eq('user_id', userId)
      .single();

    if (error || !rewards) return null;

    return {
      userId: rewards.user_id,
      points: rewards.points,
      tier: this.calculateTier(rewards.points),
      history: rewards.reward_transactions,
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
      name: tierConfig.name,
      points: tierConfig.minPoints,
      benefits: tierConfig.benefits,
      icon: tierConfig.icon,
      color: tierConfig.color,
      bgColor: tierConfig.bgColor,
    };
  }

  /**
   * Add points for a booking
   */
  async addBookingPoints(userId: string, bookingId: string): Promise<void> {
    await this.addPoints(userId, bookingId, REWARDS_CONFIG.pointsPerBooking, 'Booking completed');
  }

  /**
   * Add points for a referral
   */
  async addReferralPoints(userId: string, referredBookingId: string): Promise<void> {
    await this.addPoints(
      userId,
      referredBookingId,
      REWARDS_CONFIG.pointsPerReferral,
      'Successful referral'
    );
  }

  /**
   * Add points for a review
   */
  async addReviewPoints(userId: string, bookingId: string): Promise<void> {
    await this.addPoints(
      userId,
      bookingId,
      REWARDS_CONFIG.pointsForReview,
      'Review submitted'
    );
  }

  /**
   * Add points to user's account
   */
  private async addPoints(
    userId: string,
    bookingId: string,
    points: number,
    description: string
  ): Promise<void> {
    const { data: existingRewards } = await this.supabase
      .from('rewards')
      .select('points')
      .eq('user_id', userId)
      .single();

    const currentPoints = existingRewards?.points || 0;
    const newPoints = currentPoints + points;

    // Start a transaction
    const { error: rewardsError } = await this.supabase
      .from('rewards')
      .upsert({
        user_id: userId,
        points: newPoints,
        updated_at: new Date().toISOString(),
      });

    if (rewardsError) throw rewardsError;

    const { error: transactionError } = await this.supabase
      .from('reward_transactions')
      .insert({
        user_id: userId,
        booking_id: bookingId,
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
      // TODO: Trigger tier upgrade notification
      console.log(`User ${userId} upgraded from ${oldTier} to ${newTier}`);
      await this.emailService.sendTierUpgradeNotification(
        userId,
        userId,
        oldTier,
        newTier,
        newPoints
      );
    }
  }

  /**
   * Get points needed for next tier
   */
  getPointsForNextTier(currentPoints: number): { 
    nextTier: string | null;
    pointsNeeded: number;
  } {
    const currentTier = this.calculateTier(currentPoints);
    
    if (currentTier === 'bronze' && currentPoints < REWARDS_CONFIG.tiers.silver.minPoints) {
      return {
        nextTier: 'silver',
        pointsNeeded: REWARDS_CONFIG.tiers.silver.minPoints - currentPoints,
      };
    }
    
    if (currentTier === 'silver' && currentPoints < REWARDS_CONFIG.tiers.gold.minPoints) {
      return {
        nextTier: 'gold',
        pointsNeeded: REWARDS_CONFIG.tiers.gold.minPoints - currentPoints,
      };
    }

    return {
      nextTier: null,
      pointsNeeded: 0,
    };
  }

  /**
   * Get all available tiers
   */
  getAllTiers(): RewardsTier[] {
    return Object.values(REWARDS_CONFIG.tiers).map(tier => ({
      name: tier.name,
      points: tier.minPoints,
      benefits: tier.benefits,
      icon: tier.icon,
      color: tier.color,
      bgColor: tier.bgColor,
    }));
  }
} 