'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  MapPin, 
  Car, 
  User, 
  CreditCard, 
  Calendar,
  Star,
  Gift,
  Info,
  CheckCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Plus
} from 'lucide-react'

interface ServiceAddon {
  id: string
  name: string
  description: string
  price: number
  durationMinutes: number
  icon: 'sparkles' | 'shield' | 'star'
  category: 'protection' | 'enhancement' | 'specialty'
}

interface ServiceOption {
  id: string
  name: string
  code: string
  description: string
  basePrice: number
  durationMinutes: number
  popular: boolean
  includes: string[]
  vehicleSizes: ('S' | 'M' | 'L' | 'XL')[]
  category: 'basic' | 'premium' | 'luxury'
}

interface Vehicle {
  id: string
  registration: string
  make: string
  model: string
  year: number
  color?: string
  size: 'S' | 'M' | 'L' | 'XL'
}

interface TimeSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  available: boolean
  capacity: number
  maxCapacity: number
  pricing: {
    base_price_pence: number
    peak_surcharge_pence: number
    total_price_pence: number
    vehicle_size: string
  }
}

interface BookingSummaryProps {
  selectedService: ServiceOption | null
  selectedAddons: ServiceAddon[]
  selectedVehicle: Vehicle | 'new' | null
  newVehicleData?: {
    registration: string
    make: string
    model: string
    year: number
    color: string
  }
  selectedSlot: TimeSlot | null
  customerDetails: {
    name: string
    email: string
    phone: string
    special_requests: string
  }
  vehicleSize: 'S' | 'M' | 'L' | 'XL'
  onEdit?: (section: 'service' | 'vehicle' | 'time' | 'details') => void
  showEditButtons?: boolean
  showPricing?: boolean
  showRewardPoints?: boolean
  compact?: boolean
}

// Mock data for Step 1 - Static UI
const VEHICLE_SIZE_MULTIPLIERS = {
  S: 1.0,
  M: 1.2,
  L: 1.4,
  XL: 1.6
}

const REWARD_POINTS_MULTIPLIER = 10 // 10 points per £1 spent
const LOYALTY_TIERS = {
  bronze: { name: 'Bronze', threshold: 0, multiplier: 1.0 },
  silver: { name: 'Silver', threshold: 500, multiplier: 1.2 },
  gold: { name: 'Gold', threshold: 1000, multiplier: 1.5 },
  platinum: { name: 'Platinum', threshold: 2000, multiplier: 2.0 }
}

export function BookingSummary({ 
  selectedService, 
  selectedAddons, 
  selectedVehicle, 
  newVehicleData, 
  selectedSlot, 
  customerDetails, 
  vehicleSize, 
  onEdit, 
  showEditButtons = false,
  showPricing = true,
  showRewardPoints = true,
  compact = false
}: BookingSummaryProps) {
  const [loyaltyTier, setLoyaltyTier] = useState<'bronze' | 'silver' | 'gold' | 'platinum'>('bronze')
  const [estimatedArrival, setEstimatedArrival] = useState<string>('08:45')
  
  const formatPrice = (priceInPence: number): string => {
    return `£${(priceInPence / 100).toFixed(2)}`
  }

  const formatTime = (time: string): string => {
    return time.slice(0, 5)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const calculateServicePrice = (): number => {
    if (!selectedService) return 0
    return Math.round(selectedService.basePrice * VEHICLE_SIZE_MULTIPLIERS[vehicleSize])
  }

  const calculateAddonsPrice = (): number => {
    return selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
  }

  const calculateTotalPrice = (): number => {
    const servicePrice = calculateServicePrice()
    const addonsPrice = calculateAddonsPrice()
    const peakSurcharge = selectedSlot?.pricing?.peak_surcharge_pence || 0
    
    return servicePrice + addonsPrice + peakSurcharge
  }

  const calculateTotalDuration = (): number => {
    if (!selectedService) return 0
    
    const serviceDuration = selectedService.durationMinutes
    const addonsDuration = selectedAddons.reduce((sum, addon) => sum + addon.durationMinutes, 0)
    
    return serviceDuration + addonsDuration
  }

  const calculateRewardPoints = (): number => {
    if (!showRewardPoints) return 0
    
    const totalPrice = calculateTotalPrice()
    const basePoints = Math.floor(totalPrice / 100) * REWARD_POINTS_MULTIPLIER
    const tierMultiplier = LOYALTY_TIERS[loyaltyTier].multiplier
    
    return Math.floor(basePoints * tierMultiplier)
  }

  const getVehicleDisplay = (): string => {
    if (selectedVehicle === 'new' && newVehicleData) {
      return `${newVehicleData.registration} (${newVehicleData.make} ${newVehicleData.model})`
    } else if (selectedVehicle && selectedVehicle !== 'new') {
      return `${selectedVehicle.registration} (${selectedVehicle.make} ${selectedVehicle.model})`
    }
    return 'No vehicle selected'
  }

  const getServiceDisplay = (): string => {
    if (!selectedService) return 'No service selected'
    
    let display = selectedService.name
    if (selectedAddons.length > 0) {
      display += ` + ${selectedAddons.length} add-on${selectedAddons.length > 1 ? 's' : ''}`
    }
    return display
  }

  const isComplete = selectedService && selectedVehicle && selectedSlot && customerDetails.name && customerDetails.email

  if (compact) {
    return (
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">Quick Summary</span>
            {showEditButtons && onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit('service')}>
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/70">Service:</span>
              <span className="font-medium">{getServiceDisplay()}</span>
            </div>
            
            {selectedSlot && (
              <div className="flex justify-between">
                <span className="text-white/70">Time:</span>
                <span className="font-medium">
                  {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                </span>
              </div>
            )}
            
            {showPricing && (
              <div className="flex justify-between font-medium text-purple-600 pt-1 border-t">
                <span>Total:</span>
                <span>{formatPrice(calculateTotalPrice())}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Booking Status */}
      <Card className={`${isComplete ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <div className="font-medium">
                {isComplete ? 'Ready to Book' : 'Booking Incomplete'}
              </div>
              <div className="text-sm text-white/70">
                {isComplete 
                  ? 'All required information has been provided'
                  : 'Please complete all steps to proceed with booking'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Service Details
            </CardTitle>
            {showEditButtons && onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit('service')}>
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedService ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-lg">{selectedService.name}</div>
                  <div className="text-sm text-white/70 mb-2">{selectedService.description}</div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-600">
                    {selectedService.category.charAt(0).toUpperCase() + selectedService.category.slice(1)} Package
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600">
                    {formatPrice(calculateServicePrice())}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedService.durationMinutes} min
                  </div>
                </div>
              </div>

              {/* Service Includes */}
              <div>
                <div className="font-medium mb-2">Includes:</div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedService.includes.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Add-ons */}
              {selectedAddons.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Add-ons:</div>
                  <div className="space-y-2">
                    {selectedAddons.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Plus className="h-3 w-3 text-purple-600" />
                          <span className="text-sm">{addon.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatPrice(addon.price)}</div>
                          <div className="text-xs text-gray-500">+{addon.durationMinutes} min</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Star className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div>No service selected</div>
              <div className="text-sm">Please select a service to continue</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-purple-600" />
              Vehicle Details
            </CardTitle>
            {showEditButtons && onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit('vehicle')}>
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedVehicle ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-lg">{getVehicleDisplay()}</div>
                  {selectedVehicle !== 'new' && selectedVehicle.color && (
                    <div className="text-sm text-white/70">{selectedVehicle.color}</div>
                  )}
                  {selectedVehicle === 'new' && newVehicleData?.color && (
                    <div className="text-sm text-white/70">{newVehicleData.color}</div>
                  )}
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                  Size: {vehicleSize}
                </Badge>
              </div>
              
              <div className="text-sm text-white/70">
                Vehicle size affects pricing ({VEHICLE_SIZE_MULTIPLIERS[vehicleSize]}x multiplier)
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Car className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div>No vehicle selected</div>
              <div className="text-sm">Please select a vehicle to continue</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Slot Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Appointment Details
            </CardTitle>
            {showEditButtons && onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit('time')}>
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedSlot ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">Date</div>
                  <div className="text-sm text-white/70">{formatDate(selectedSlot.date)}</div>
                </div>
                <div>
                  <div className="font-medium">Time</div>
                  <div className="text-sm text-white/70">
                    {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">Duration</div>
                  <div className="text-sm text-white/70">{calculateTotalDuration()} minutes</div>
                </div>
                <div>
                  <div className="font-medium">Estimated Arrival</div>
                  <div className="text-sm text-white/70">{estimatedArrival}</div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Appointment Info</span>
                </div>
                <div className="text-sm text-blue-700">
                  Our team will arrive 15 minutes before your appointment time for setup
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div>No time slot selected</div>
              <div className="text-sm">Please select a date and time to continue</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Customer Details
            </CardTitle>
            {showEditButtons && onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit('details')}>
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {customerDetails.name && customerDetails.email ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">Name</div>
                  <div className="text-sm text-white/70">{customerDetails.name}</div>
                </div>
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-white/70">{customerDetails.email}</div>
                </div>
              </div>
              
              {customerDetails.phone && (
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-sm text-white/70">{customerDetails.phone}</div>
                </div>
              )}
              
              {customerDetails.special_requests && (
                <div>
                  <div className="font-medium">Special Requests</div>
                  <div className="text-sm text-white/70 p-2 bg-gray-50 rounded">
                    {customerDetails.special_requests}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div>No customer details provided</div>
              <div className="text-sm">Please provide your contact information</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      {showPricing && (
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Pricing Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedService && (
                <div className="flex justify-between items-center">
                  <span>{selectedService.name}</span>
                  <span className="font-medium">{formatPrice(calculateServicePrice())}</span>
                </div>
              )}
              
              {selectedAddons.map((addon) => (
                <div key={addon.id} className="flex justify-between items-center text-sm">
                  <span>+ {addon.name}</span>
                  <span>{formatPrice(addon.price)}</span>
                </div>
              ))}
              
              {selectedSlot?.pricing?.peak_surcharge_pence && selectedSlot.pricing.peak_surcharge_pence > 0 && (
                <div className="flex justify-between items-center text-sm text-amber-600">
                  <span>Peak Hours Surcharge</span>
                  <span>{formatPrice(selectedSlot.pricing.peak_surcharge_pence)}</span>
                </div>
              )}
              
              <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-purple-600">{formatPrice(calculateTotalPrice())}</span>
              </div>
              
              {showRewardPoints && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    Reward Points Earned
                  </span>
                  <span>+{calculateRewardPoints()}</span>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Payment due on completion of service (Cash only)
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}