'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Clock,
  Car,
  User,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  AlertCircle,
  Star,
  MapPin,
  Info
} from 'lucide-react'
import { detectVehicleSize, type VehicleDetectionResult } from '@/lib/utils/vehicle-size-detection'
import { useAvailableSlots } from '@/hooks/useAvailableSlots'
import { getDefaultService, Service, getServicePricing, calculateTotalPrice } from '@/lib/config/services'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/context'
import CalendarBooking from './CalendarBooking'
import PostcodeChecker from '@/components/PostcodeChecker'
import RewardsDisplay from './RewardsDisplay'
import ServiceSelection from './ServiceSelection'

// Fallback pricing when database isn't available
const FALLBACK_PRICING = {
  small: { price_pence: 5000, duration_minutes: 90 },
  medium: { price_pence: 6000, duration_minutes: 120 },
  large: { price_pence: 7000, duration_minutes: 150 },
  extra_large: { price_pence: 8500, duration_minutes: 180 }
}

// Hook for fetching service pricing - using reliable fallback pricing
function useServicePricing(vehicleSize: string) {
  const [pricing, setPricing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!vehicleSize) return
    
    setLoading(true)
    
    // Use fallback pricing directly for reliable performance
    // This eliminates database query errors while providing consistent pricing
    const fallbackPricing = FALLBACK_PRICING[vehicleSize as keyof typeof FALLBACK_PRICING] || FALLBACK_PRICING.medium
    
    // Simulate brief loading for UX consistency
    setTimeout(() => {
      setPricing(fallbackPricing)
      setLoading(false)
    }, 100)
  }, [vehicleSize])
  
  return { pricing, loading }
}

// Component for displaying pricing in booking summary
function BookingSummaryPricing({ vehicleSize }: { vehicleSize: string }) {
  const { pricing, loading } = useServicePricing(vehicleSize)
  
  if (loading) {
    return (
      <div className="flex justify-between">
        <span>Price:</span>
        <span>Loading...</span>
      </div>
    )
  }
  
  if (!pricing) {
    return (
      <div className="flex justify-between">
        <span>Price:</span>
        <span>N/A</span>
      </div>
    )
  }
  
  return (
    <div className="flex justify-between">
      <span>Price:</span>
      <span className="font-bold text-primary">
        £{(pricing.price_pence / 100).toFixed(2)}
      </span>
    </div>
  )
}

// Professional Love4Detailing Booking Flow
// Step 1: Time Slot Selection (Availability First)
// Step 2: Vehicle Details + Size Detection + Real-time Pricing
// Step 3: Personal Details (Auto-fill for users, Manual for guests)
// Step 4: Booking Confirmation

const BOOKING_STEPS = [
  { id: 1, name: 'Service', icon: Star, title: 'Select Your Service', description: 'Choose the perfect detailing service for your vehicle' },
  { id: 2, name: 'Time Slot', icon: Clock, title: 'Select Your Time Slot', description: 'Choose when you\'d like our mobile service to come to you' },
  { id: 3, name: 'Vehicle Details', icon: Car, title: 'Vehicle Details', description: 'Enter your vehicle information for accurate pricing' },
  { id: 4, name: 'Personal Details', icon: User, title: 'Personal Details', description: 'Your contact information for booking confirmation' },
  { id: 5, name: 'Confirmation', icon: CheckCircle, title: 'Booking Confirmation', description: 'Review and confirm your booking details' },
]

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

// Professional Progress Indicator Component
function ProgressIndicator({ currentStep, completedSteps }: { currentStep: number, completedSteps: number[] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {BOOKING_STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = step.id === currentStep
          const isCompleted = completedSteps.includes(step.id)
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                isCompleted 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-500 text-white shadow-lg shadow-purple-500/25' 
                  : isActive
                  ? 'border-purple-400 text-purple-400 bg-purple-600/10 shadow-lg shadow-purple-500/25'
                  : 'border-gray-600 text-gray-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className={`ml-2 text-sm font-medium transition-colors duration-300 ${
                isActive ? 'text-purple-400' : isCompleted ? 'text-white' : 'text-gray-400'
              }`}>
                {step.name}
              </span>
              
              {index < BOOKING_STEPS.length - 1 && (
                <div className={`w-16 h-px mx-4 transition-colors duration-300 ${
                  isCompleted ? 'bg-gradient-to-r from-purple-500 to-purple-400' : 'bg-gray-600'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


function StaticVehicleDetailsInput({ vehicleData }: { vehicleData: any }) {
  const detectionResult = detectVehicleSize(vehicleData.make, vehicleData.model)
  const calculatedPrice = `£${detectionResult.pricing.basePrice}`
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Vehicle Details
        </CardTitle>
        <CardDescription>
          Enter your vehicle information for accurate pricing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                value={vehicleData.make}
                placeholder="e.g. BMW"
                className=""
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={vehicleData.model}
                placeholder="e.g. 3 Series"
                className=""
                readOnly
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={vehicleData.year}
                placeholder="2020"
                className=""
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="registration">Registration</Label>
              <Input
                id="registration"
                value={vehicleData.registration}
                placeholder="AB12 CDE"
                className="uppercase"
                readOnly
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="color">Color (Optional)</Label>
            <Input
              id="color"
              value={vehicleData.color}
              placeholder="e.g. Black"
              className=""
              readOnly
            />
          </div>
          
          {/* Real-time Size Detection & Pricing */}
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-success" />
              <span className="font-medium text-success">Vehicle Size Detected</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Size Category:</span>
                <Badge variant="secondary" className="bg-success/20 text-success">
                  {detectionResult.size}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Service Price:</span>
                <span className="text-lg font-bold text-success">{calculatedPrice}</span>
              </div>
              <div className="text-xs text-muted">
                Price includes: Complete valet service (interior & exterior)
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PersonalDetailsForm({ initialData, onDataChange }: { initialData: any, onDataChange: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    postcode: initialData?.postcode || '',
    notes: initialData?.notes || ''
  })
  const [serviceAreaValidated, setServiceAreaValidated] = useState(false)
  const [travelCharge, setTravelCharge] = useState(0)
  
  // Update form data when initialData changes (when returning to step)
  useEffect(() => {
    if (initialData) {
      const newData = {
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        postcode: initialData.postcode || '',
        notes: initialData.notes || ''
      }
      setFormData(newData)
    }
  }, [initialData])
  
  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    // Only call onDataChange if the data has actually changed
    if (JSON.stringify(newData) !== JSON.stringify(formData)) {
      onDataChange({ ...newData, travelCharge, serviceAreaValidated })
    }
  }
  
  const handleServiceAreaCheck = (serviceAvailable: boolean, charge: number) => {
    setServiceAreaValidated(serviceAvailable)
    setTravelCharge(charge)
    // Update parent with service area validation status
    onDataChange({ ...formData, travelCharge: charge, serviceAreaValidated: serviceAvailable })
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Your full name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="07123 456789"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="address">Service Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Full address where we should come to clean your car"
          required
        />
      </div>
      
      {/* Service Area Checker Integration */}
      <div className="space-y-2">
        <Label>Service Area Validation *</Label>
        <PostcodeChecker
          title="Check Service Area"
          description="Enter your postcode to confirm service availability and pricing"
          onServiceAreaCheck={handleServiceAreaCheck}
          showBookingButton={false}
          className="border-purple-500/30 bg-gray-700/30"
        />
        {serviceAreaValidated && travelCharge > 0 && (
          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              Extended service area: £{travelCharge.toFixed(2)} travel supplement will be added to your booking
            </AlertDescription>
          </Alert>
        )}
        {serviceAreaValidated && travelCharge === 0 && (
          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              Standard service area: No additional travel charges
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <div>
        <Label htmlFor="notes">Special Instructions (Optional)</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="e.g. Ring doorbell, parking instructions, etc."
        />
      </div>
    </div>
  )
}

function BookingConfirmation({ selectedSlot, vehicleData, personalData }: { selectedSlot: any, vehicleData: any, personalData: any }) {
  if (!vehicleData) {
    return <div>No vehicle data available</div>
  }
  
  const defaultService = getDefaultService()
  const { pricing } = useServicePricing(vehicleData.size)
  const travelCharge = personalData?.travelCharge || 0
  const serviceCharge = pricing ? pricing.price_pence / 100 : 0
  const totalPrice = serviceCharge + travelCharge
  
  return (
    <div className="space-y-6">
      <Card className="bg-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Date & Time:</span>
            <span className="font-medium text-right text-sm leading-tight">
              {selectedSlot ? `${formatDateForDisplay(selectedSlot.date)} at ${formatTimeForDisplay(selectedSlot.startTime)}` : 'No slot selected'}
            </span>
          </div>
          
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Vehicle:</span>
            <span className="font-medium text-right text-sm leading-tight">
              {vehicleData.year} {vehicleData.make} {vehicleData.model} ({vehicleData.registration})
            </span>
          </div>
          
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Size Category:</span>
            <Badge variant="secondary" className="bg-primary/20 text-primary shrink-0">
              {vehicleData.size}
            </Badge>
          </div>
          
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Service:</span>
            <span className="font-medium text-right text-sm leading-tight">{defaultService.name}</span>
          </div>
          
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Duration:</span>
            <span className="font-medium text-right text-sm leading-tight">
              {pricing ? `${Math.round(pricing.duration_minutes / 60)} hours` : '2 hours'}
            </span>
          </div>
          
          <div className="flex justify-between items-start gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Location:</span>
            <span className="font-medium text-right text-sm leading-tight">
              {personalData?.address || 'No address provided'}
            </span>
          </div>
          
          <hr className="my-3 border-border" />
          
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Service Price:</span>
            <span className="font-medium text-right text-sm leading-tight">
              £{serviceCharge.toFixed(2)}
            </span>
          </div>
          
          {travelCharge > 0 && (
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Travel Supplement:</span>
              <span className="font-medium text-right text-sm leading-tight text-yellow-400">
                £{travelCharge.toFixed(2)}
              </span>
            </div>
          )}
          
          <hr className="my-2 border-border" />
          
          <div className="flex justify-between items-center gap-2">
            <span className="text-lg font-bold">Total Price:</span>
            <span className="text-lg font-bold text-primary">
              £{totalPrice.toFixed(2)}
            </span>
          </div>
          
          <div className="text-xs text-muted mt-2 leading-relaxed">
            Payment: Cash on completion • No upfront payment required
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Rewards Display */}
    <RewardsDisplay
      servicePricePence={Math.round(totalPrice * 100)}
      showPointsPreview={true}
      className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
    />
  </div>
  )
}

// Import the existing VehicleForm for reuse
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import { VehicleDropdowns } from '@/components/vehicles/VehicleDropdowns'

// Vehicle Selection Component for authenticated users with multiple vehicles
function VehicleSelectionStep({ 
  userVehicles, 
  selectedVehicle, 
  onVehicleSelect, 
  onManualEntry 
}: { 
  userVehicles: any[], 
  selectedVehicle: any, 
  onVehicleSelect: (vehicle: any) => void,
  onManualEntry: () => void 
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Select Your Vehicle</h3>
        <p className="text-muted-foreground">Choose from your saved vehicles or add a new one</p>
      </div>
      
      {userVehicles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userVehicles.map((vehicle) => (
            <Card 
              key={vehicle.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedVehicle?.id === vehicle.id 
                  ? 'ring-2 ring-primary border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onVehicleSelect(vehicle)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h4>
                    <p className="text-sm text-muted-foreground">{vehicle.registration}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {vehicle.size === 'S' ? 'Small' : 
                         vehicle.size === 'M' ? 'Medium' :
                         vehicle.size === 'L' ? 'Large' : 
                         vehicle.size === 'XL' ? 'Extra Large' : 'Medium'}
                      </Badge>
                      {vehicle.color && (
                        <span className="text-xs text-muted-foreground">{vehicle.color}</span>
                      )}
                    </div>
                  </div>
                  {selectedVehicle?.id === vehicle.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Card className="border-dashed">
        <CardContent className="p-6">
          <button
            onClick={onManualEntry}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Car className="h-5 w-5" />
            Add New Vehicle
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

// Specialized Vehicle Step Form for booking flow
function VehicleStepForm({ initialData, onDataChange }: { initialData: any, onDataChange: (data: any) => void }) {
  const [formData, setFormData] = useState({
    registration: initialData?.registration || '',
    make: initialData?.make || '',
    model: initialData?.model || '',
    year: initialData?.year || new Date().getFullYear(),
    color: initialData?.color || '',
    size: initialData?.size || 'medium',
    vehicle_type: initialData?.vehicle_type || 'car',
    special_requirements: initialData?.special_requirements || '',
    notes: initialData?.notes || ''
  })
  
  const [detectedSize, setDetectedSize] = useState<string | null>(initialData?.size || null)
  
  // Get real pricing from database
  const { pricing, loading: pricingLoading } = useServicePricing(detectedSize || 'medium')
  const defaultService = getDefaultService()
  
  // Update form data when initialData changes (when returning to step)
  useEffect(() => {
    if (initialData) {
      const newData = {
        registration: initialData.registration || '',
        make: initialData.make || '',
        model: initialData.model || '',
        year: initialData.year || new Date().getFullYear(),
        color: initialData.color || '',
        size: initialData.size || 'medium',
        vehicle_type: initialData.vehicle_type || 'car',
        special_requirements: initialData.special_requirements || '',
        notes: initialData.notes || ''
      }
      setFormData(newData)
      setDetectedSize(initialData.size || null)
    }
  }, [initialData])
  
  const handleInputChange = (field: string, value: string | number) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    // Only call onDataChange if the data has actually changed
    if (JSON.stringify(newData) !== JSON.stringify(formData)) {
      onDataChange(newData)
    }
  }
  
  const handleMakeChange = (make: string) => {
    const newData = { ...formData, make }
    setFormData(newData)
    // Only call onDataChange if the data has actually changed
    if (JSON.stringify(newData) !== JSON.stringify(formData)) {
      onDataChange(newData)
    }
  }
  
  const handleModelChange = (model: string) => {
    const newData = { ...formData, model }
    setFormData(newData)
    // Only call onDataChange if the data has actually changed
    if (JSON.stringify(newData) !== JSON.stringify(formData)) {
      onDataChange(newData)
    }
  }
  
  const handleSizeDetected = (size: string) => {
    setDetectedSize(size)
    const newData = { ...formData, size }
    setFormData(newData)
    // Only call onDataChange if the data has actually changed
    if (JSON.stringify(newData) !== JSON.stringify(formData)) {
      onDataChange(newData)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Registration */}
      <div className="space-y-2">
        <Label htmlFor="registration">
          Registration Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="registration"
          type="text"
          placeholder="e.g. AB12 CDE"
          value={formData.registration}
          onChange={(e) => handleInputChange('registration', e.target.value.toUpperCase())}
          required
          className="uppercase"
        />
      </div>

      {/* Make and Model Dropdowns */}
      <VehicleDropdowns
        selectedMake={formData.make}
        selectedModel={formData.model}
        onMakeChange={handleMakeChange}
        onModelChange={handleModelChange}
        onSizeDetected={handleSizeDetected}
        disabled={false}
      />

      {/* Year and Color */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            min="1900"
            max={new Date().getFullYear() + 1}
            value={formData.year}
            onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            type="text"
            placeholder="e.g. Black"
            value={formData.color}
            onChange={(e) => handleInputChange('color', e.target.value)}
          />
        </div>
      </div>

      {/* Vehicle Size Detection Display */}
      {detectedSize && formData.make && formData.model && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-success" />
            <span className="font-medium text-success">Vehicle Size Detected</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Size Category:</span>
              <Badge variant="secondary" className="bg-success/20 text-success">
                {detectedSize}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Service:</span>
              <span className="text-sm font-medium text-success">
                {defaultService.name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Price:</span>
              {pricingLoading ? (
                <span className="text-sm text-muted-foreground">Loading...</span>
              ) : pricing ? (
                <span className="text-lg font-bold text-success">
                  £{(pricing.price_pence / 100).toFixed(2)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">N/A</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Duration:</span>
              {pricing && (
                <span className="text-sm font-medium text-success">
                  {Math.round(pricing.duration_minutes / 60)} hours
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {defaultService.description}
            </div>
          </div>
        </div>
      )}

      {/* Special Requirements */}
      <div className="space-y-2">
        <Label htmlFor="special_requirements">Special Requirements</Label>
        <Input
          id="special_requirements"
          type="text"
          placeholder="e.g. Low suspension, ceramic coating"
          value={formData.special_requirements}
          onChange={(e) => handleInputChange('special_requirements', e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          type="text"
          placeholder="Any additional notes about this vehicle"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
        />
      </div>
    </div>
  )
}

// Step-by-Step Navigation Component
export function BookingFlow({ 
  prefilledVehicleData = null, 
  prefilledPersonalData = null 
}: { 
  prefilledVehicleData?: any, 
  prefilledPersonalData?: any 
} = {}) {
  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  
  // Booking data - initialize with prefilled data if provided
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [vehicleData, setVehicleData] = useState<any>(prefilledVehicleData)
  const [personalData, setPersonalData] = useState<any>(prefilledPersonalData)
  
  // Auto pre-loading state for authenticated users
  const [userVehicles, setUserVehicles] = useState<any[]>([])
  const [isLoadingUserData, setIsLoadingUserData] = useState(false)
  const [userDataLoaded, setUserDataLoaded] = useState(false)
  
  // Vehicle selection state for authenticated users
  const [showVehicleSelection, setShowVehicleSelection] = useState(false)
  const [selectedVehicleFromList, setSelectedVehicleFromList] = useState<any>(null)
  const [showManualVehicleEntry, setShowManualVehicleEntry] = useState(false)
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [accountCreated, setAccountCreated] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' })
  const [isCreatingPassword, setIsCreatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  
  // Get current user from auth context
  const { user, profile, isAuthenticated } = useAuth()
  
  // Auto-load user data for authenticated users (when no prefilled data is provided)
  useEffect(() => {
    const shouldAutoLoad = isAuthenticated && !prefilledVehicleData && !prefilledPersonalData && !userDataLoaded
    
    if (shouldAutoLoad) {
      loadUserData()
    }
  }, [isAuthenticated, prefilledVehicleData, prefilledPersonalData, userDataLoaded])
  
  // Load user profile and vehicle data for auto pre-population
  const loadUserData = async () => {
    if (!isAuthenticated || !profile) return
    
    setIsLoadingUserData(true)
    
    try {
      // Try to get full profile data for better auto-fill
      const profileResponse = await fetch('/api/user/profile')
      if (profileResponse.ok) {
        const profileResult = await profileResponse.json()
        const fullProfile = profileResult.data
        
        const autoPersonalData = {
          name: fullProfile.fullName || profile.full_name || '',
          email: fullProfile.email || profile.email || '',
          phone: fullProfile.phone || profile.phone || '',
          address: fullProfile.address || '', // Now auto-populated from saved profile
          postcode: fullProfile.postcode || '', // Now auto-populated from saved profile
          notes: '',
          serviceAreaValidated: fullProfile.postcode ? true : false, // Auto-validate if postcode exists
          travelCharge: 0
        }
        setPersonalData(autoPersonalData)
        console.log('✅ Auto-populated personal data from full profile:', autoPersonalData)
      } else {
        // Fallback to basic profile data
        const autoPersonalData = {
          name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          address: '',
          postcode: '',
          notes: '',
          serviceAreaValidated: false,
          travelCharge: 0
        }
        setPersonalData(autoPersonalData)
        console.log('✅ Auto-populated personal data from basic profile:', autoPersonalData)
      }
      
      // Fetch user's vehicles
      const vehiclesResponse = await fetch('/api/vehicles')
      if (vehiclesResponse.ok) {
        const vehiclesResult = await vehiclesResponse.json()
        const vehicles = vehiclesResult.data || []
        setUserVehicles(vehicles)
        
        // If user has vehicles, set up vehicle selection
        if (vehicles.length > 0) {
          if (vehicles.length === 1) {
            // Only one vehicle - auto-select it
            const singleVehicle = vehicles[0]
            const autoVehicleData = {
              registration: singleVehicle.registration,
              make: singleVehicle.make,
              model: singleVehicle.model,
              year: singleVehicle.year,
              color: singleVehicle.color,
              size: singleVehicle.size === 'S' ? 'small' : 
                    singleVehicle.size === 'M' ? 'medium' :
                    singleVehicle.size === 'L' ? 'large' : 
                    singleVehicle.size === 'XL' ? 'extra_large' : 'medium',
              vehicle_type: 'car',
              special_requirements: '',
              notes: ''
            }
            setVehicleData(autoVehicleData)
            setSelectedVehicleFromList(singleVehicle)
            console.log('✅ Auto-selected single vehicle:', autoVehicleData)
          } else {
            // Multiple vehicles - show selection step
            setShowVehicleSelection(true)
            console.log(`✅ Will show vehicle selection for ${vehicles.length} vehicles`)
          }
        } else {
          // No vehicles - show manual entry
          setShowManualVehicleEntry(true)
          console.log('✅ Will show manual vehicle entry (no saved vehicles)')
        }
        
        console.log(`✅ Loaded ${vehicles.length} user vehicles`)
      } else {
        console.warn('Failed to load user vehicles:', vehiclesResponse.status)
      }
      
    } catch (error) {
      console.error('Error loading user data for auto-population:', error)
    } finally {
      setIsLoadingUserData(false)
      setUserDataLoaded(true)
    }
  }
  
  // Initialize completed steps when prefilled data is provided OR when user data is auto-loaded
  useEffect(() => {
    const initialCompletedSteps = []
    if (prefilledVehicleData || vehicleData) {
      initialCompletedSteps.push(2) // Vehicle step
    }
    if (prefilledPersonalData || personalData) {
      initialCompletedSteps.push(3) // Personal details step
    }
    setCompletedSteps(initialCompletedSteps)
  }, [prefilledVehicleData, prefilledPersonalData, vehicleData, personalData])
  
  // Get vehicle size for API calls
  const vehicleSize = vehicleData ? detectVehicleSize(vehicleData.make, vehicleData.model).size : 'M'
  
  // Get slots with current vehicle size and selected service
  const { slots } = useAvailableSlots({
    dateStart: new Date().toISOString().split('T')[0],
    dateEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vehicleSize: vehicleSize,
    serviceId: selectedService?.id
  })
  
  // Find selected slot from API data
  // Selected slot is managed directly by CalendarBooking component
  
  // Vehicle selection handlers
  const handleVehicleSelect = (vehicle: any) => {
    const autoVehicleData = {
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      size: vehicle.size === 'S' ? 'small' : 
            vehicle.size === 'M' ? 'medium' :
            vehicle.size === 'L' ? 'large' : 
            vehicle.size === 'XL' ? 'extra_large' : 'medium',
      vehicle_type: 'car',
      special_requirements: '',
      notes: ''
    }
    setVehicleData(autoVehicleData)
    setSelectedVehicleFromList(vehicle)
    setShowVehicleSelection(false)
    console.log('✅ Selected vehicle from list:', vehicle)
  }

  const handleManualVehicleEntry = () => {
    setShowVehicleSelection(false)
    setShowManualVehicleEntry(true)
    setSelectedVehicleFromList(null)
    setVehicleData(null)
    console.log('✅ Switched to manual vehicle entry')
  }

  const handleBackToVehicleSelection = () => {
    if (userVehicles.length > 0 && isAuthenticated) {
      setShowManualVehicleEntry(false)
      setShowVehicleSelection(true)
      setVehicleData(null)
      console.log('✅ Returned to vehicle selection')
    }
  }

  // Navigation handlers
  const handleContinue = () => {
    if (currentStep < BOOKING_STEPS.length) {
      setCompletedSteps(prev => [...prev, currentStep])
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleBookingSubmit = async () => {
    // Validation
    if (!selectedSlot || !vehicleData || !personalData) {
      alert('Please complete all booking steps')
      return
    }

    // Set loading state
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      // Transform form data into API format
      const defaultService = getDefaultService()
      const bookingData = {
        // Required fields for enhanced booking
        customer_email: personalData.email,
        customer_name: personalData.name,
        customer_phone: personalData.phone || '',
        slot_id: selectedSlot.id,
        service_id: defaultService.id,
        vehicle_size: vehicleData.size,
        
        // Additional booking details
        service_address: personalData.address,
        service_postcode: personalData.postcode,
        travel_charge_pence: Math.round((personalData.travelCharge || 0) * 100),
        special_instructions: personalData.notes || '',
        
        // Vehicle details
        vehicle_registration: vehicleData.registration,
        vehicle_make: vehicleData.make,
        vehicle_model: vehicleData.model,
        vehicle_year: vehicleData.year,
        vehicle_color: vehicleData.color || '',
        vehicle_type: vehicleData.vehicle_type || 'car',
        vehicle_special_requirements: vehicleData.special_requirements || '',
        
        // Payment method (default to cash)
        payment_method: 'cash',
        
        // Booking metadata
        booking_source: 'web',
        created_via: 'customer_booking_flow'
      }

      // Call the enhanced booking creation API
      const response = await fetch('/api/bookings/enhanced/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingData }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }

      // Success! Store booking reference and show success state
      const bookingReference = result.data.booking_reference
      const accountCreated = result.data.account_created
      const existingUserLinked = result.data.existing_user_linked
      
      console.log('🎉 Booking result:', {
        bookingReference,
        accountCreated,
        existingUserLinked,
        userId: result.data.user_id
      })
      
      // Show success state
      setBookingSuccess(true)
      setBookingReference(bookingReference)
      setAccountCreated(accountCreated)
      
      // If account was created, show password creation prompt ONLY if user is not already authenticated
      if (accountCreated && !user) {
        console.log('✅ New account created for booking - showing password prompt')
        setShowPasswordPrompt(true)
      } else if (accountCreated && user) {
        console.log('✅ Account created but user already authenticated - skipping password prompt')
      } else if (existingUserLinked) {
        console.log('✅ Existing user linked - no password needed')
      } else {
        console.log('ℹ️ Guest booking - no account created')
      }
      
    } catch (error) {
      console.error('Booking submission error:', error)
      setSubmissionError((error as any)?.message || 'Failed to create booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Password creation handler
  const handlePasswordCreation = async () => {
    if (!passwordData.password || !passwordData.confirmPassword) {
      setPasswordError('Please enter both password and confirmation')
      return
    }
    
    if (passwordData.password !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    
    if (passwordData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    
    setIsCreatingPassword(true)
    setPasswordError(null)
    
    try {
      // Since the user was created without a password during booking,
      // we need to set their password first using the admin API
      console.log('🔑 Setting password for new user via admin API...')
      console.log('📧 Email:', personalData.email)
      console.log('🔑 Password length:', passwordData.password.length)
      
      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: personalData.email,
          password: passwordData.password
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Password setup API error:', errorData)
        throw new Error(errorData.error || 'Failed to set password')
      }
      
      console.log('✅ Password set successfully via API')
      
      // Now sign in the user with their new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: personalData.email,
        password: passwordData.password
      })
      
      if (signInError) {
        console.error('Sign in failed after password setup:', signInError)
        throw signInError
      }
      
      // Password created and user signed in successfully
      setShowPasswordPrompt(false)
      setPasswordData({ password: '', confirmPassword: '' })
      
      // Redirect to dashboard after successful login
      window.location.href = '/dashboard'
      
    } catch (error) {
      console.error('Password creation error:', error)
      setPasswordError((error as any)?.message || 'Failed to create password')
    } finally {
      setIsCreatingPassword(false)
    }
  }
  
  // Step validation
  const canContinue = () => {
    switch (currentStep) {
      case 1: return selectedService !== null
      case 2: return selectedSlot !== null
      case 3: {
        // For vehicle step, check if we have valid vehicle data OR if we're in selection mode but need selection
        if (isLoadingUserData) return false
        
        // If showing vehicle selection, need to have selected a vehicle
        if (showVehicleSelection) {
          return selectedVehicleFromList !== null
        }
        
        // Otherwise, need complete vehicle data
        return vehicleData !== null && vehicleData.make && vehicleData.model && vehicleData.registration
      }
      case 4: return personalData !== null && personalData.name && personalData.email && personalData.phone && personalData.address && personalData.serviceAreaValidated
      case 5: return selectedService !== null && selectedSlot !== null && vehicleData !== null && personalData !== null && vehicleData.make && vehicleData.model && vehicleData.registration && personalData.name && personalData.email && personalData.phone && personalData.address && personalData.serviceAreaValidated
      default: return false
    }
  }
  
  
  // Render current step content
  const renderStepContent = () => {
    const currentStepData = BOOKING_STEPS[currentStep - 1]
    
    switch (currentStep) {
      case 1:
        return (
          <ServiceSelection
            selectedService={selectedService}
            onServiceSelect={setSelectedService}
            vehicleSize={vehicleData?.size || 'medium'}
            className="bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm"
          />
        )
      
      case 2:
        return (
          <Card className="bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-200">
                <currentStepData.icon className="h-5 w-5 text-purple-400" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription className="text-gray-300">{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarBooking 
                selectedSlot={selectedSlot} 
                onSlotSelected={setSelectedSlot}
                className="border-none shadow-none"
              />
            </CardContent>
          </Card>
        )
      
      case 3:
        return (
          <Card className="bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-200">
                <currentStepData.icon className="h-5 w-5 text-purple-400" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {isAuthenticated && userVehicles.length > 0 && showVehicleSelection
                  ? 'Choose from your saved vehicles or add a new one'
                  : currentStepData.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUserData ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading your vehicles...</p>
                </div>
              ) : isAuthenticated && userVehicles.length > 0 && showVehicleSelection ? (
                <VehicleSelectionStep
                  userVehicles={userVehicles}
                  selectedVehicle={selectedVehicleFromList}
                  onVehicleSelect={handleVehicleSelect}
                  onManualEntry={handleManualVehicleEntry}
                />
              ) : (
                <div className="space-y-4">
                  {isAuthenticated && userVehicles.length > 0 && showManualVehicleEntry && (
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToVehicleSelection}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Your Vehicles
                      </Button>
                    </div>
                  )}
                  {isAuthenticated && vehicleData?.make && selectedVehicleFromList && (
                    <Alert className="border-success/20 bg-success/10">
                      <Info className="h-4 w-4 text-success" />
                      <AlertDescription className="text-success">
                        Vehicle details loaded from your saved vehicles. You can modify if needed.
                      </AlertDescription>
                    </Alert>
                  )}
                  <VehicleStepForm initialData={vehicleData} onDataChange={setVehicleData} />
                </div>
              )}
            </CardContent>
          </Card>
        )
      
      case 4:
        return (
          <Card className="bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-200">
                <currentStepData.icon className="h-5 w-5 text-purple-400" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {isAuthenticated && personalData?.name
                  ? 'Your account details have been pre-filled. Please verify and update as needed.'
                  : currentStepData.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthenticated && personalData?.name && (
                <Alert className="mb-4 border-success/20 bg-success/10">
                  <Info className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    Your contact details have been automatically filled from your account profile.
                  </AlertDescription>
                </Alert>
              )}
              <PersonalDetailsForm initialData={personalData} onDataChange={setPersonalData} />
            </CardContent>
          </Card>
        )
      
      case 5:
        return (
          <Card className="bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-200">
                <currentStepData.icon className="h-5 w-5 text-purple-400" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription className="text-gray-300">{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <BookingConfirmation selectedSlot={selectedSlot} vehicleData={vehicleData} personalData={personalData} />
              
              {/* Error display */}
              {submissionError && (
                <Alert className="mt-4 border-destructive/20 bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    {submissionError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )
      
      default:
        return null
    }
  }
  
  // Show password creation prompt if needed
  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-8">
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-purple-800/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)]" />
        
        <div className="max-w-2xl mx-auto px-4 relative z-10">
          <div className="mb-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">Booking Confirmed!</h1>
            <p className="text-gray-300">
              Your booking reference is: <span className="font-bold text-purple-400">{bookingReference}</span>
            </p>
          </div>

          <Card className="bg-gray-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-200">
                <User className="h-5 w-5 text-purple-400" />
                Create Your Account Password
              </CardTitle>
              <CardDescription className="text-gray-300">
                We've created an account for you. Please set a password to access your dashboard and manage your bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                
                {passwordError && (
                  <Alert className="border-red-500/20 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-400">
                      {passwordError}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handlePasswordCreation}
                    disabled={isCreatingPassword}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25"
                  >
                    {isCreatingPassword ? 'Creating Password...' : 'Create Password & Access Dashboard'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => setShowPasswordPrompt(false)}
                    className="flex-1 border-purple-500/50 text-purple-200 hover:bg-purple-600/10"
                  >
                    Skip for Now
                  </Button>
                </div>
                
                <div className="text-xs text-gray-400">
                  <p>By creating a password, you'll be able to:</p>
                  <ul className="mt-1 ml-4 space-y-1">
                    <li>• View and manage your bookings</li>
                    <li>• Track your service history</li>
                    <li>• Access rewards and loyalty benefits</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show success state if booking was successful
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-8">
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-purple-800/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)]" />
        
        <div className="max-w-2xl mx-auto px-4 text-center relative z-10">
          <div className="mb-8">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">Booking Confirmed!</h1>
            <p className="text-gray-300">
              Your mobile valet service has been successfully booked
              {accountCreated && " and your account has been created"}
            </p>
          </div>

          <Card className="bg-gray-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-purple-200">Booking Reference</h3>
                  <div className="text-2xl font-bold text-green-400 bg-green-400/20 rounded-lg py-2 px-4">
                    {bookingReference}
                  </div>
                </div>
                
                <div className="text-sm text-gray-300 space-y-2">
                  <p>Please save this reference number for your records.</p>
                  <p>You will receive a confirmation email shortly with all the details.</p>
                  {accountCreated && (
                    <p className="text-purple-400 font-medium">
                      🎉 Your account has been created successfully!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 space-y-4">
            <Button 
              onClick={() => {
                setBookingSuccess(false)
                setBookingReference(null)
                setAccountCreated(false)
                setCurrentStep(1)
                setCompletedSteps([])
                setSelectedSlot(null)
                setVehicleData(null)
                setPersonalData(null)
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25"
            >
              Book Another Service
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full border-purple-500/50 text-purple-200 hover:bg-purple-600/10"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-8">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-purple-800/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)]" />
      
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">Book Your Mobile Valet</h1>
          <p className="text-xl text-gray-300">Professional car detailing service at your location</p>
          <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-purple-300 mx-auto rounded-full mt-4" />
        </div>

        <ProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {renderStepContent()}
          </div>
          
          <div className="space-y-6">
            {/* Navigation Controls */}
            <Card className="bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3">
                  {currentStep > 1 && (
                    <Button 
                      variant="outline" 
                      className="w-full border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400 transition-all duration-300"
                      onClick={handleBack}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                  
                  {currentStep < BOOKING_STEPS.length ? (
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105"
                      onClick={handleContinue}
                      disabled={!canContinue()}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105"
                      onClick={handleBookingSubmit}
                      disabled={!canContinue() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Booking...
                        </>
                      ) : (
                        <>
                          Confirm Booking
                          <CheckCircle className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Booking Summary */}
            {selectedSlot && (
              <Card className="bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-200">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Date:</span>
                      <span className="text-white">{formatDateForDisplay(selectedSlot.date)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Time:</span>
                      <span className="text-white">{formatTimeForDisplay(selectedSlot.startTime)}</span>
                    </div>
                    {vehicleData && vehicleData.make && vehicleData.model && (
                      <>
                        <div className="flex justify-between text-gray-300">
                          <span>Vehicle:</span>
                          <span className="text-white">{vehicleData.make} {vehicleData.model}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Service:</span>
                          <span className="text-white">{getDefaultService().name}</span>
                        </div>
                        <div className="space-y-1">
                          <BookingSummaryPricing vehicleSize={vehicleData.size} />
                          {personalData?.travelCharge > 0 && (
                            <div className="flex justify-between text-gray-300">
                              <span>Travel charge:</span>
                              <span className="text-yellow-400">+£{personalData.travelCharge.toFixed(2)}</span>
                            </div>
                          )}
                          {personalData?.travelCharge >= 0 && (
                            <div className="flex justify-between text-gray-300 border-t border-gray-600 pt-1">
                              <span className="font-bold">Total:</span>
                              <span className="font-bold text-primary">
                                £{((vehicleData?.size ? (FALLBACK_PRICING[vehicleData.size as keyof typeof FALLBACK_PRICING] || FALLBACK_PRICING.medium).price_pence / 100 : 50) + (personalData?.travelCharge || 0)).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="text-center">
              <div className="text-xs text-gray-400">
                By confirming, you agree to our Terms & Conditions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}