'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Loader2,
  Info
} from 'lucide-react'
import { usePostcodeValidation } from '@/hooks/usePostcodeValidation'

interface PersonalDetailsFormData {
  name: string
  email: string
  phone: string
  address: string
  postcode: string
  notes: string
}

interface PersonalDetailsWithPostcodeProps {
  initialData: PersonalDetailsFormData | null
  onDataChange: (data: PersonalDetailsFormData & { 
    serviceArea?: 'standard' | 'extended' | 'outside'
    travelCharge?: number
    postcodeValid?: boolean
  }) => void
}

export function PersonalDetailsWithPostcode({ 
  initialData, 
  onDataChange 
}: PersonalDetailsWithPostcodeProps) {
  const [formData, setFormData] = useState<PersonalDetailsFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    postcode: initialData?.postcode || '',
    notes: initialData?.notes || ''
  })
  
  const {
    setPostcode,
    isLoading,
    result,
    error,
    isValid,
    serviceAvailable,
    serviceArea,
    travelCharge,
    distance,
    message,
    isStandardArea,
    isExtendedArea,
    hasTravelCharge,
    formattedDistance,
    formattedTravelCharge
  } = usePostcodeValidation({
    autoValidate: true,
    debounceDelay: 800,
    onValidationComplete: (result) => {
      // Update parent component with validation results
      onDataChange({
        ...formData,
        serviceArea: result.serviceArea,
        travelCharge: result.travelCharge || 0,
        postcodeValid: result.valid && result.serviceAvailable
      })
    }
  })
  
  // Update form data when initialData changes
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
      
      // Set postcode for validation if provided
      if (initialData.postcode) {
        setPostcode(initialData.postcode)
      }
    }
  }, [initialData, setPostcode])
  
  const handleInputChange = (field: keyof PersonalDetailsFormData, value: string) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    
    // Handle postcode validation
    if (field === 'postcode') {
      setPostcode(value)
    }
    
    // Notify parent of changes
    onDataChange({
      ...newData,
      serviceArea: result?.serviceArea,
      travelCharge: result?.travelCharge || 0,
      postcodeValid: result?.valid && result?.serviceAvailable
    })
  }
  
  const getPostcodeStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
    if (isStandardArea) return <CheckCircle className="h-4 w-4 text-green-400" />
    if (isExtendedArea) return <AlertTriangle className="h-4 w-4 text-yellow-400" />
    if (result && !serviceAvailable) return <XCircle className="h-4 w-4 text-red-400" />
    return null
  }
  
  const getPostcodeStatusColor = () => {
    if (isStandardArea) return 'border-green-500/20 bg-green-500/10'
    if (isExtendedArea) return 'border-yellow-500/20 bg-yellow-500/10'
    if (result && !serviceAvailable) return 'border-red-500/20 bg-red-500/10'
    return 'border-purple-500/20 bg-purple-500/10'
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-gray-300">Full Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Your full name"
          required
          className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
        />
      </div>
      
      <div>
        <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="your@email.com"
          required
          className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
        />
      </div>
      
      <div>
        <Label htmlFor="phone" className="text-gray-300">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="07123 456789"
          required
          className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
        />
      </div>
      
      {/* Postcode Input with Validation */}
      <div>
        <Label htmlFor="postcode" className="text-gray-300">Service Postcode *</Label>
        <div className="relative">
          <Input
            id="postcode"
            value={formData.postcode}
            onChange={(e) => handleInputChange('postcode', e.target.value.toUpperCase())}
            placeholder="e.g. SW9 0AA"
            required
            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-10"
            maxLength={8}
          />
          {getPostcodeStatusIcon() && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {getPostcodeStatusIcon()}
            </div>
          )}
        </div>
        
        {/* Postcode Validation Feedback */}
        {result && formData.postcode && (
          <div className={`mt-2 p-3 rounded-lg border ${getPostcodeStatusColor()}`}>
            <div className="flex items-start gap-2">
              {getPostcodeStatusIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">{message}</p>
                
                {distance && (
                  <p className="text-xs text-gray-300 mb-2">
                    Distance from SW9: {formattedDistance}
                  </p>
                )}
                
                {/* Pricing Information */}
                {serviceAvailable && (
                  <div className="space-y-1">
                    {isStandardArea && (
                      <p className="text-xs text-green-400">
                        ✓ Standard pricing applies - no additional travel charges
                      </p>
                    )}
                    
                    {isExtendedArea && hasTravelCharge && (
                      <p className="text-xs text-yellow-400">
                        ⚠️ Additional {formattedTravelCharge} travel charge will be added
                      </p>
                    )}
                  </div>
                )}
                
                {/* Service Unavailable */}
                {result && !serviceAvailable && (
                  <p className="text-xs text-red-400">
                    Please contact us at 0800 123 4567 to discuss special arrangements
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Postcode Error */}
        {error && !result && formData.postcode && (
          <Alert className="mt-2 border-red-500/20 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <div>
        <Label htmlFor="address" className="text-gray-300">Full Service Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="House number, street name, area"
          required
          className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
        />
        <p className="text-xs text-gray-400 mt-1">
          Please include house number and street name for accurate service delivery
        </p>
      </div>
      
      <div>
        <Label htmlFor="notes" className="text-gray-300">Special Instructions (Optional)</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="e.g. Ring doorbell, parking instructions, etc."
          className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
        />
      </div>
      
      {/* Service Area Information */}
      <div className="mt-4 p-3 rounded-lg border border-purple-500/20 bg-purple-500/10">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-purple-400 mt-0.5" />
          <div className="text-xs text-gray-300">
            <p className="font-medium text-purple-200 mb-1">Service Area Information</p>
            <p>We serve SW9 and surrounding areas within 25 miles</p>
            <p>Standard pricing within 10 miles • Extended areas with travel supplement</p>
          </div>
        </div>
      </div>
    </div>
  )
}