'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Trophy, 
  Star, 
  Crown, 
  Gift, 
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { 
  calculateRewardsDiscount, 
  formatDiscountInfo, 
  TIER_COLORS,
  type RewardsDiscount 
} from '@/lib/utils/rewards-integration'

interface RewardsDisplayProps {
  servicePricePence: number
  onDiscountCalculated?: (discount: RewardsDiscount) => void
  showPointsPreview?: boolean
  className?: string
}

const TIER_ICONS = {
  bronze: Trophy,
  silver: Star,
  gold: Crown,
  platinum: Sparkles
}

export default function RewardsDisplay({ 
  servicePricePence, 
  onDiscountCalculated, 
  showPointsPreview = true,
  className = ''
}: RewardsDisplayProps) {
  const [discount, setDiscount] = useState<RewardsDiscount | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (servicePricePence > 0) {
      loadDiscount()
    }
  }, [servicePricePence])

  const loadDiscount = async () => {
    setIsLoading(true)
    try {
      const discountData = await calculateRewardsDiscount(servicePricePence, true)
      if (discountData) {
        setDiscount(discountData)
        onDiscountCalculated?.(discountData)
      }
    } catch (error) {
      console.error('Error loading discount:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={`${className} border-primary/20`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Calculating rewards...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!discount) {
    return null
  }

  const tierColor = TIER_COLORS[discount.current_tier as keyof typeof TIER_COLORS]
  const TierIcon = TIER_ICONS[discount.current_tier as keyof typeof TIER_ICONS]
  const discountInfo = formatDiscountInfo(discount)

  return (
    <Card className={`${className} border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5 text-primary" />
          Rewards & Savings
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Tier Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${tierColor.bg}`}>
              <TierIcon className={`h-4 w-4 ${tierColor.text}`} />
            </div>
            <div>
              <p className="font-medium text-sm">
                {discount.current_tier.charAt(0).toUpperCase() + discount.current_tier.slice(1)} Member
              </p>
              <p className="text-xs text-muted-foreground">
                {discount.current_points} points
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={`${tierColor.text} ${tierColor.bg}`}>
            {discount.discount_percentage}% OFF
          </Badge>
        </div>

        {/* Discount Information */}
        {discount.discount_percentage > 0 && (
          <div className="space-y-2 p-3 bg-background/50 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="text-sm">Original Price:</span>
              <span className="text-sm line-through text-muted-foreground">
                {discountInfo.originalPrice}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Discount ({discount.discount_percentage}%):</span>
              <span className="text-sm text-green-600 font-medium">
                -{discountInfo.discountAmount}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="font-medium">Final Price:</span>
              <span className="font-bold text-primary text-lg">
                {discountInfo.finalPrice}
              </span>
            </div>
          </div>
        )}

        {/* Points Preview */}
        {showPointsPreview && (
          <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">
                You'll earn {discount.points_to_earn} points
              </p>
              <p className="text-xs text-muted-foreground">
                From this booking completion
              </p>
            </div>
          </div>
        )}

        {/* Savings Message */}
        {discount.discount_percentage > 0 && (
          <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 font-medium">
              🎉 {discount.savings_info.tier_benefit}
            </p>
            <p className="text-xs text-green-600">
              You saved {discountInfo.discountAmount} on this booking!
            </p>
          </div>
        )}

        {/* Next Tier Preview */}
        {discount.current_tier !== 'platinum' && (
          <div className="text-center p-2 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground">
              {discount.current_tier === 'bronze' ? 'Reach Silver at 500 points for 10% off' :
               discount.current_tier === 'silver' ? 'Reach Gold at 1000 points for 15% off' :
               'Reach Platinum at 2000 points for 20% off'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}