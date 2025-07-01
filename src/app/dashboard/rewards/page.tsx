import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { RewardsHistory } from '@/components/rewards/RewardsHistory';
import { RewardsService } from '@/lib/services/rewards';
import { createClient } from '@/lib/api/supabase';
import {
  GiftIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Rewards - Love4Detailing',
  description: 'View your loyalty points and rewards.',
};

// Move to constants file
const REWARDS_TIERS = [
  {
    name: 'Bronze',
    points: 0,
    icon: StarIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    benefits: [
      'Earn 1 point per £1 spent',
      'Birthday special offer',
      'Monthly newsletter',
    ],
  },
  {
    name: 'Silver',
    points: 500,
    icon: SparklesIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    benefits: [
      'Earn 1.5 points per £1 spent',
      'Priority booking',
      'Exclusive discounts',
      'Quarterly detail report',
    ],
  },
  {
    name: 'Gold',
    points: 1000,
    icon: TrophyIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    benefits: [
      'Earn 2 points per £1 spent',
      'VIP booking slots',
      'Free upgrades',
      'Annual detail package',
      'Direct support line',
    ],
  },
];

async function getRewardsData(userId: string) {
  const rewardsService = new RewardsService();
  return rewardsService.getUserRewards(userId);
}

export default async function RewardsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null; // Handle in middleware
  }

  const rewardsData = await getRewardsData(user.id);
  const userPoints = rewardsData?.points || 0;
  
  const currentTier = REWARDS_TIERS.reduce((prev, curr) => {
    if (userPoints >= curr.points) return curr;
    return prev;
  }, REWARDS_TIERS[0]);

  const nextTier = REWARDS_TIERS[REWARDS_TIERS.indexOf(currentTier) + 1];
  const pointsToNextTier = nextTier ? nextTier.points - userPoints : 0;
  
  // Calculate progress percentage for current tier
  const progressToNextTier = nextTier
    ? ((userPoints - currentTier.points) / (nextTier.points - currentTier.points)) * 100
    : 100;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Rewards Program</h1>
        <p className="text-gray-600">
          Earn points with every service and unlock exclusive benefits.
        </p>
      </div>

      {/* Current Status */}
      <Card className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-primary-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <ProgressRing
              progress={progressToNextTier}
              size={100}
              className={currentTier.color}
            >
              <currentTier.icon className="w-8 h-8" />
            </ProgressRing>
            <div>
              <h2 className="text-xl font-semibold">{currentTier.name} Member</h2>
              <p className="text-gray-600">Current Points: {userPoints}</p>
              {nextTier && (
                <p className="text-sm text-gray-500">
                  {pointsToNextTier} points until {nextTier.name}
                </p>
              )}
            </div>
          </div>
          {nextTier && (
            <div className="text-center md:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                <nextTier.icon className={`w-5 h-5 ${nextTier.color}`} />
                <span>Next Tier: {nextTier.name}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Points History and Tiers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Points History */}
        <div className="lg:col-span-2">
          <RewardsHistory 
            transactions={rewardsData?.history || []}
          />
        </div>

        {/* Current Benefits */}
        <div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Your Benefits</h3>
            <ul className="space-y-3">
              {currentTier.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <GiftIcon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Membership Tiers */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6">Membership Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REWARDS_TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={`p-6 ${
                tier.name === currentTier.name
                  ? 'ring-2 ring-primary-600'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${tier.bgColor}`}>
                  <tier.icon className={`w-6 h-6 ${tier.color}`} />
                </div>
                <h3 className="text-lg font-semibold">{tier.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {tier.points.toLocaleString()} points to qualify
              </p>
              <ul className="space-y-2">
                {tier.benefits.map((benefit, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <GiftIcon className="w-4 h-4 text-primary-600" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Coming Soon */}
      <Card className="p-6 text-center bg-gray-50">
        <SparklesIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">More Features Coming Soon</h2>
        <p className="text-gray-600 mb-4">
          We're working on exciting new rewards and benefits for our loyal customers.
        </p>
        <Button variant="outline">
          Learn More
        </Button>
      </Card>
    </div>
  );
} 