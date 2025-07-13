'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import EnhancedCustomerDashboardLayout from "@/components/dashboard/EnhancedCustomerDashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Gift, 
  Star, 
  Trophy, 
  Crown, 
  Calendar, 
  DollarSign,
  ArrowRight,
  CheckCircle,
  Lock
} from 'lucide-react'

interface RewardTransaction {
  id: string
  type: 'earned' | 'redeemed'
  points: number
  description: string
  date: string
  booking_reference?: string
}

interface RewardBenefit {
  id: string
  name: string
  description: string
  required_tier: 'bronze' | 'silver' | 'gold'
  points_cost?: number
  icon: React.ComponentType<{ className?: string }>
  available: boolean
}

const REWARD_TIERS = {
  bronze: {
    name: 'Bronze',
    icon: Trophy,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    minPoints: 0,
    maxPoints: 499,
    benefits: ['5% service discount', 'Priority booking', 'Service reminders']
  },
  silver: {
    name: 'Silver',
    icon: Star,
    color: 'text-white',
    bgColor: 'bg-white/15',
    borderColor: 'border-white/30',
    minPoints: 500,
    maxPoints: 999,
    benefits: ['10% service discount', 'Free car air freshener', 'Monthly care tips', 'Priority support']
  },
  gold: {
    name: 'Gold',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    minPoints: 1000,
    maxPoints: Infinity,
    benefits: ['15% service discount', 'Free premium wax', 'VIP booking slots', 'Personal detailer', 'Birthday bonus']
  }
}

const REWARD_BENEFITS: RewardBenefit[] = [
  {
    id: '1',
    name: 'Free Car Air Freshener',
    description: 'Premium car air freshener with next service',
    required_tier: 'silver',
    points_cost: 100,
    icon: Gift,
    available: true
  },
  {
    id: '2',
    name: 'Service Upgrade',
    description: 'Upgrade to premium service package',
    required_tier: 'silver',
    points_cost: 200,
    icon: Star,
    available: true
  },
  {
    id: '3',
    name: 'Free Premium Wax',
    description: 'Professional ceramic wax application',
    required_tier: 'gold',
    points_cost: 300,
    icon: Crown,
    available: true
  },
  {
    id: '4',
    name: '20% Service Discount',
    description: 'One-time 20% discount on any service',
    required_tier: 'gold',
    points_cost: 400,
    icon: DollarSign,
    available: true
  }
]

export default function RewardsPage() {
  const { profile, statistics, isLoading } = useAuth()
  const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)

  useEffect(() => {
    fetchRewardTransactions()
  }, [])

  const fetchRewardTransactions = async () => {
    try {
      const response = await fetch('/api/rewards/transactions')
      if (response.ok) {
        const { data } = await response.json()
        setRewardTransactions(data || [])
      } else {
        console.error('Failed to fetch reward transactions:', response.status)
      }
    } catch (error) {
      console.error('Error fetching reward transactions:', error)
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  const redeemReward = async (rewardId: string) => {
    try {
      const response = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId })
      })
      
      if (response.ok) {
        // Refresh transactions and statistics
        fetchRewardTransactions()
        // You might want to refresh the statistics here
      }
    } catch (error) {
      console.error('Error redeeming reward:', error)
    }
  }

  if (isLoading) {
    return (
      <EnhancedCustomerDashboardLayout title="Rewards & Loyalty" subtitle="Earn points and unlock exclusive benefits">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </EnhancedCustomerDashboardLayout>
    )
  }

  if (!profile) {
    return (
      <EnhancedCustomerDashboardLayout title="Rewards & Loyalty" subtitle="Earn points and unlock exclusive benefits">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
          </CardHeader>
        </Card>
      </EnhancedCustomerDashboardLayout>
    )
  }

  const currentTier = (statistics?.reward_tier || 'bronze') as keyof typeof REWARD_TIERS
  const currentPoints = statistics?.reward_points || 0
  const tierInfo = REWARD_TIERS[currentTier]
  const TierIcon = tierInfo.icon

  // Calculate progress to next tier
  const getNextTierProgress = () => {
    if (currentTier === 'gold') return 100
    
    const nextTier = currentTier === 'bronze' ? 'silver' : 'gold'
    const nextTierMinPoints = REWARD_TIERS[nextTier].minPoints
    const currentTierMaxPoints = tierInfo.maxPoints === Infinity ? nextTierMinPoints : tierInfo.maxPoints
    
    return Math.min(100, (currentPoints / nextTierMinPoints) * 100)
  }

  const getPointsToNextTier = () => {
    if (currentTier === 'gold') return 0
    
    const nextTier = currentTier === 'bronze' ? 'silver' : 'gold'
    const nextTierMinPoints = REWARD_TIERS[nextTier].minPoints
    
    return Math.max(0, nextTierMinPoints - currentPoints)
  }

  return (
    <EnhancedCustomerDashboardLayout title="Rewards & Loyalty" subtitle="Earn points and unlock exclusive benefits">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">Rewards & Loyalty</h1>
          <p className="text-muted-foreground">Earn points and unlock exclusive benefits</p>
        </div>

        {/* Current Tier Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className={`${tierInfo.bgColor} ${tierInfo.borderColor}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TierIcon className={`h-6 w-6 ${tierInfo.color}`} />
                {tierInfo.name} Member
              </CardTitle>
              <CardDescription>
                Your current loyalty tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{currentPoints}</div>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Tier Progress</CardTitle>
              <CardDescription>
                {currentTier === 'gold' 
                  ? 'You\'re at the highest tier!' 
                  : `${getPointsToNextTier()} points to ${currentTier === 'bronze' ? 'Silver' : 'Gold'}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={getNextTierProgress()} className="mb-2" />
              <div className="text-sm text-muted-foreground">
                {currentTier === 'gold' ? '100% Complete' : `${getNextTierProgress().toFixed(0)}% Complete`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Earning Rate</CardTitle>
              <CardDescription>
                Points per service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">1</div>
              <p className="text-sm text-muted-foreground">Point per £1 spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Your {tierInfo.name} Benefits</CardTitle>
            <CardDescription>
              Exclusive perks available to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tierInfo.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Available Rewards */}
        <Card>
          <CardHeader>
            <CardTitle>Available Rewards</CardTitle>
            <CardDescription>
              Redeem your points for exclusive rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REWARD_BENEFITS.map((reward) => {
                const canRedeem = currentPoints >= (reward.points_cost || 0) && 
                                REWARD_TIERS[currentTier].minPoints >= REWARD_TIERS[reward.required_tier].minPoints
                const RewardIcon = reward.icon

                return (
                  <Card key={reward.id} className={`${canRedeem ? 'border-primary/20' : 'border-border opacity-60'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${canRedeem ? 'bg-primary/10' : 'bg-muted'}`}>
                          <RewardIcon className={`h-5 w-5 ${canRedeem ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{reward.name}</h3>
                          <p className="text-xs text-muted-foreground mb-2">{reward.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {reward.points_cost} points
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {REWARD_TIERS[reward.required_tier].name}+
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              disabled={!canRedeem}
                              onClick={() => redeemReward(reward.id)}
                              className="text-xs"
                            >
                              {canRedeem ? 'Redeem' : <Lock className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Points History */}
        <Card>
          <CardHeader>
            <CardTitle>Points History</CardTitle>
            <CardDescription>
              Your recent reward activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : rewardTransactions.length > 0 ? (
              <div className="space-y-3">
                {rewardTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'earned' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {transaction.type === 'earned' ? (
                          <DollarSign className="h-4 w-4 text-green-600" />
                        ) : (
                          <Gift className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                          {transaction.booking_reference && ` • Booking ${transaction.booking_reference}`}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      transaction.type === 'earned' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'earned' ? '+' : '-'}{transaction.points}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted" />
                <p>No reward activity yet</p>
                <p className="text-sm mt-2">Complete bookings to start earning points!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EnhancedCustomerDashboardLayout>
  )
}