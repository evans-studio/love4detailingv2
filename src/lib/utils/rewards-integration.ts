/**
 * Rewards System Integration Utilities
 * Helper functions to integrate rewards with booking system
 */

export interface RewardsDiscount {
  original_price_pence: number
  discount_percentage: number
  discount_amount_pence: number
  final_price_pence: number
  current_tier: string
  current_points: number
  points_to_earn: number
  savings_info: {
    amount_saved: number
    percentage_saved: number
    tier_benefit: string
  }
}

export interface PointsEarned {
  success: boolean
  points_earned: number
  new_total: number
  old_tier: string
  new_tier: string
  tier_upgraded: boolean
  transactions: number
  message: string
}

/**
 * Calculate discount for a booking based on user's reward tier
 */
export async function calculateRewardsDiscount(
  servicePricePence: number,
  applyDiscount: boolean = true
): Promise<RewardsDiscount | null> {
  try {
    const response = await fetch('/api/rewards/discount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_price_pence: servicePricePence,
        apply_discount: applyDiscount
      })
    })

    if (response.ok) {
      const { data } = await response.json()
      return data
    } else {
      console.error('Failed to calculate rewards discount:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error calculating rewards discount:', error)
    return null
  }
}

/**
 * Award points for a completed booking
 */
export async function awardBookingPoints(
  bookingId: string,
  amountSpentPence: number,
  isFirstBooking: boolean = false
): Promise<PointsEarned | null> {
  try {
    const response = await fetch('/api/rewards/earn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'booking_completed',
        booking_id: bookingId,
        amount_spent_pence: amountSpentPence,
        is_first_booking: isFirstBooking
      })
    })

    if (response.ok) {
      const { data } = await response.json()
      return data
    } else {
      console.error('Failed to award booking points:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error awarding booking points:', error)
    return null
  }
}

/**
 * Award points for review submission
 */
export async function awardReviewPoints(
  bookingId: string
): Promise<PointsEarned | null> {
  try {
    const response = await fetch('/api/rewards/earn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'review_submitted',
        booking_id: bookingId
      })
    })

    if (response.ok) {
      const { data } = await response.json()
      return data
    } else {
      console.error('Failed to award review points:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error awarding review points:', error)
    return null
  }
}

/**
 * Award points for successful referral
 */
export async function awardReferralPoints(): Promise<PointsEarned | null> {
  try {
    const response = await fetch('/api/rewards/earn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'referral_success'
      })
    })

    if (response.ok) {
      const { data } = await response.json()
      return data
    } else {
      console.error('Failed to award referral points:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error awarding referral points:', error)
    return null
  }
}

/**
 * Get current user's discount percentage
 */
export async function getCurrentUserDiscount(): Promise<number> {
  try {
    const response = await fetch('/api/rewards/discount')
    
    if (response.ok) {
      const { data } = await response.json()
      return data.discount_percentage || 0
    } else {
      console.error('Failed to get user discount:', response.status)
      return 0
    }
  } catch (error) {
    console.error('Error getting user discount:', error)
    return 0
  }
}

/**
 * Format discount information for display
 */
export function formatDiscountInfo(discount: RewardsDiscount): {
  originalPrice: string
  discountAmount: string
  finalPrice: string
  savingsMessage: string
} {
  return {
    originalPrice: `£${(discount.original_price_pence / 100).toFixed(2)}`,
    discountAmount: `£${(discount.discount_amount_pence / 100).toFixed(2)}`,
    finalPrice: `£${(discount.final_price_pence / 100).toFixed(2)}`,
    savingsMessage: discount.discount_percentage > 0 
      ? `You saved ${discount.savings_info.tier_benefit}!`
      : 'No discount applied'
  }
}

/**
 * Format points information for display
 */
export function formatPointsInfo(points: PointsEarned): {
  pointsMessage: string
  tierMessage: string
  celebrationMessage: string
} {
  return {
    pointsMessage: `+${points.points_earned} points earned`,
    tierMessage: points.tier_upgraded 
      ? `Upgraded to ${points.new_tier.charAt(0).toUpperCase() + points.new_tier.slice(1)} tier!`
      : `${points.new_tier.charAt(0).toUpperCase() + points.new_tier.slice(1)} tier`,
    celebrationMessage: points.tier_upgraded 
      ? `🎉 Congratulations! You've been upgraded to ${points.new_tier.charAt(0).toUpperCase() + points.new_tier.slice(1)} tier!`
      : `You earned ${points.points_earned} points!`
  }
}

/**
 * Tier colors for UI components
 */
export const TIER_COLORS = {
  bronze: {
    text: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    accent: 'bg-amber-600'
  },
  silver: {
    text: 'text-gray-700',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    accent: 'bg-gray-600'
  },
  gold: {
    text: 'text-yellow-700',
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    accent: 'bg-yellow-600'
  },
  platinum: {
    text: 'text-purple-700',
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    accent: 'bg-purple-600'
  }
}

/**
 * Tier benefits for display
 */
export const TIER_BENEFITS = {
  bronze: {
    discount: 5,
    benefits: ['5% service discount', 'Priority booking reminders', 'Service care tips']
  },
  silver: {
    discount: 10,
    benefits: ['10% service discount', 'Free car air freshener', 'Monthly care tips', 'Priority support']
  },
  gold: {
    discount: 15,
    benefits: ['15% service discount', 'Free premium wax upgrade', 'VIP booking slots', 'Personal detailer preference', 'Birthday bonus points']
  },
  platinum: {
    discount: 20,
    benefits: ['20% service discount', 'Free interior protection', 'Express booking priority', 'Personal account manager', 'Exclusive seasonal offers']
  }
}