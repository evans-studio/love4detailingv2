'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MapPin, Clock, Car, Award } from 'lucide-react'
import { getDefaultService } from '@/lib/config/services'
import { calculateTotalWithTravelCharge } from '@/lib/utils/postcode-distance'

// Fallback pricing when database isn't available
const FALLBACK_PRICING = {
  small: { price_pence: 5000, duration_minutes: 90 },
  medium: { price_pence: 6000, duration_minutes: 120 },
  large: { price_pence: 7000, duration_minutes: 150 },
  extra_large: { price_pence: 8500, duration_minutes: 180 }
}

interface BookingConfirmationWithTravelProps {
  selectedSlot: any
  vehicleData: any
  personalData: any & {
    serviceArea?: 'standard' | 'extended' | 'outside'
    travelCharge?: number
    postcodeValid?: boolean
  }
}

// Utility function to format date for display
function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    })
  }
}

// Utility function to format time for display
function formatTimeForDisplay(timeString: string): string {
  return timeString.slice(0, 5) // Extract HH:MM from HH:MM:SS
}

export function BookingConfirmationWithTravel({ 
  selectedSlot, 
  vehicleData, 
  personalData 
}: BookingConfirmationWithTravelProps) {
  if (!vehicleData) {
    return <div className="text-white">No vehicle data available</div>
  }
  
  const defaultService = getDefaultService()
  
  // Get pricing (using fallback for reliability)
  const vehicleSize = vehicleData.size || 'medium'
  const pricing = FALLBACK_PRICING[vehicleSize as keyof typeof FALLBACK_PRICING] || FALLBACK_PRICING.medium
  const basePrice = pricing.price_pence / 100
  const travelCharge = personalData?.travelCharge || 0
  
  // Calculate total pricing
  const { total, breakdown } = calculateTotalWithTravelCharge(basePrice, travelCharge)
  
  return (
    <Card className="bg-gray-800/50 border-purple-500/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg text-purple-200">Booking Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Date & Time:
            </span>
            <span className="font-medium text-right text-sm leading-tight text-white">
              {selectedSlot ? `${formatDateForDisplay(selectedSlot.date)} at ${formatTimeForDisplay(selectedSlot.startTime)}` : 'No slot selected'}
            </span>
          </div>
          
          {/* Vehicle */}
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap flex items-center gap-1">
              <Car className="h-4 w-4" />
              Vehicle:
            </span>
            <span className="font-medium text-right text-sm leading-tight text-white">
              {vehicleData.year} {vehicleData.make} {vehicleData.model} ({vehicleData.registration})
            </span>
          </div>
          
          {/* Size Category */}
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap">Size Category:</span>
            <Badge variant="secondary" className="bg-purple-600/20 text-purple-200 border-purple-500/30 shrink-0">
              {vehicleData.size}
            </Badge>
          </div>
          
          {/* Service */}
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap flex items-center gap-1">
              <Award className="h-4 w-4" />
              Service:
            </span>
            <span className="font-medium text-right text-sm leading-tight text-white">{defaultService.name}</span>
          </div>
          
          {/* Duration */}
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap">Duration:</span>
            <span className="font-medium text-right text-sm leading-tight text-white">
              {Math.round(pricing.duration_minutes / 60)} hours
            </span>
          </div>
          
          {/* Service Address */}
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Location:
            </span>
            <span className="font-medium text-right text-sm leading-tight text-white">
              {personalData?.address || 'No address provided'}
            </span>
          </div>
          
          {/* Service Area Status */}
          {personalData?.serviceArea && (
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm text-gray-400 whitespace-nowrap">Service Area:</span>
              <Badge 
                variant="secondary" 
                className={`shrink-0 ${
                  personalData.serviceArea === 'standard' 
                    ? 'bg-green-600/20 text-green-200 border-green-500/30'
                    : personalData.serviceArea === 'extended'
                    ? 'bg-yellow-600/20 text-yellow-200 border-yellow-500/30'
                    : 'bg-red-600/20 text-red-200 border-red-500/30'
                }`}
              >
                {personalData.serviceArea === 'standard' ? 'Standard' : 
                 personalData.serviceArea === 'extended' ? 'Extended' : 'Outside'}
              </Badge>
            </div>
          )}
          
          <hr className="border-gray-600" />
          
          {/* Pricing Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm text-gray-400">Service Price:</span>
              <span className="text-sm font-medium text-white">
                £{basePrice.toFixed(2)}
              </span>
            </div>
            
            {travelCharge > 0 && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-yellow-400">Travel Charge:</span>
                <span className="text-sm font-medium text-yellow-400">
                  £{travelCharge.toFixed(2)}
                </span>
              </div>
            )}
            
            <hr className="border-gray-600" />
            
            <div className="flex justify-between items-center gap-2">
              <span className="text-lg font-bold text-white">Total Price:</span>
              <span className="text-lg font-bold text-purple-400">
                £{total.toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* Payment Information */}
          <div className="text-xs text-gray-400 leading-relaxed bg-gray-700/30 p-3 rounded-lg">
            <p className="font-medium text-gray-300 mb-1">Payment Information:</p>
            <p>Payment: Cash on completion • No upfront payment required</p>
            {travelCharge > 0 && (
              <p className="text-yellow-400 mt-1">
                Travel charge applies due to extended service area
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}