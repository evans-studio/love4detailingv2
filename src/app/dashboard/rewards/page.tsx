'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ui/progressRing';
import { RewardsHistory } from '@/components/rewards/RewardsHistory';
import { RewardsService } from '@/lib/services/rewards';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Gift,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UserRewards } from '@/types';

// Move to constants file
const REWARDS_TIERS = [
  {
    name: 'Bronze',
    points: 0,
    icon: Star,
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
    icon: Sparkles,
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
    icon: Trophy,
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

export default function RewardsPage() {
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadRewards() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const rewardsService = new RewardsService();
        const userRewards = await rewardsService.getUserRewards(user.id);
        setRewards(userRewards);
      } catch (error) {
        console.error('Failed to load rewards:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRewards();
  }, [supabase]);

  if (!mounted) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 bg-[#262626] rounded mb-2" />
          <div className="h-4 w-96 bg-[#262626] rounded" />
        </div>
        <Card className="mb-8 p-6 bg-[#1E1E1E] border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-[#262626]" />
              <div>
                <div className="h-6 w-32 bg-[#262626] rounded mb-2" />
                <div className="h-4 w-24 bg-[#262626] rounded" />
              </div>
            </div>
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 bg-[#1E1E1E] border-gray-800">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-[#262626]" />
                <div>
                  <div className="h-4 w-24 bg-[#262626] rounded mb-2" />
                  <div className="h-6 w-16 bg-[#262626] rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-[#C7C7C7]">Loading rewards...</div>;
  }

  if (!rewards) {
    return <div className="text-[#C7C7C7]">No rewards found</div>;
  }

  const userPoints = rewards.currentPoints || 0;
  
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
        <h1 className="text-3xl font-bold mb-2 text-[#F2F2F2]">Rewards Program</h1>
        <p className="text-[#C7C7C7]">
          Earn points with every service and unlock exclusive benefits.
        </p>
      </div>

      {/* Current Status */}
      <Card className="mb-8 p-6 bg-[#1E1E1E] border-gray-800">
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
              <h2 className="text-xl font-semibold text-[#F2F2F2]">{currentTier.name} Member</h2>
              <p className="text-[#C7C7C7]">Current Points: {userPoints}</p>
              {nextTier && (
                <p className="text-sm text-[#8B8B8B]">
                  {pointsToNextTier} points until {nextTier.name}
                </p>
              )}
            </div>
          </div>
          {nextTier && (
            <div className="text-center md:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#262626] rounded-full shadow-sm">
                <nextTier.icon className={`w-5 h-5 ${nextTier.color}`} />
                <span className="text-[#F2F2F2]">Next Tier: {nextTier.name}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Points Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-[#262626] p-3">
              <Star className="h-6 w-6 text-[#9146FF]" />
            </div>
            <div>
              <p className="text-sm text-[#8B8B8B]">Current Points</p>
              <p className="text-2xl font-bold text-[#F2F2F2]">{rewards.currentPoints}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-[#262626] p-3">
              <Trophy className="h-6 w-6 text-[#9146FF]" />
            </div>
            <div>
              <p className="text-sm text-[#8B8B8B]">Lifetime Points</p>
              <p className="text-2xl font-bold text-[#F2F2F2]">{rewards.lifetimePoints}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-[#262626] p-3">
              <Gift className="h-6 w-6 text-[#9146FF]" />
            </div>
            <div>
              <p className="text-sm text-[#8B8B8B]">Available Rewards</p>
              <p className="text-2xl font-bold text-[#F2F2F2]">{rewards.availableRewards}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Points History and Tiers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Points History */}
        <div className="lg:col-span-2">
          <RewardsHistory />
        </div>

        {/* Current Benefits */}
        <div>
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h3 className="text-lg font-semibold mb-4 text-[#F2F2F2]">Your Benefits</h3>
            <ul className="space-y-3">
              {currentTier.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Gift className="w-4 h-4 text-[#9146FF] flex-shrink-0" />
                  <span className="text-[#C7C7C7]">{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Membership Tiers */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6 text-[#F2F2F2]">Membership Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REWARDS_TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={`p-6 bg-[#1E1E1E] border-gray-800 ${
                tier.name === currentTier.name
                  ? 'ring-2 ring-[#9146FF]'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full bg-[#262626]`}>
                  <tier.icon className={`w-6 h-6 ${tier.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-[#F2F2F2]">{tier.name}</h3>
              </div>
              <p className="text-sm text-[#C7C7C7] mb-4">
                {tier.points.toLocaleString()} points to qualify
              </p>
              <ul className="space-y-2">
                {tier.benefits.map((benefit, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#9146FF]" />
                    <span className="text-[#C7C7C7]">{benefit}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Coming Soon */}
      <Card className="p-6 text-center bg-[#1E1E1E] border-gray-800">
        <Sparkles className="w-12 h-12 text-[#9146FF] mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2 text-[#F2F2F2]">More Features Coming Soon</h2>
        <p className="text-[#C7C7C7] mb-4">
          We're working on exciting new rewards and benefits for our loyal customers.
        </p>
        <Button variant="outline">
          Learn More
        </Button>
      </Card>
    </div>
  );
} 