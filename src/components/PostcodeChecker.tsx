'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { usePostcodeValidation } from '@/hooks/usePostcodeValidation'
import { getServiceAreaMessage } from '@/lib/utils/postcode-distance'
import Link from 'next/link'

interface PostcodeCheckerProps {
  className?: string
  onServiceAreaCheck?: (serviceAvailable: boolean, travelCharge: number) => void
  showBookingButton?: boolean
  title?: string
  description?: string
}

export function PostcodeChecker({
  className = '',
  onServiceAreaCheck,
  showBookingButton = true,
  title = 'Check Service Area',
  description = 'Enter your postcode to check if we serve your area'
}: PostcodeCheckerProps) {
  const [inputValue, setInputValue] = useState('')
  
  const {
    postcode,
    setPostcode,
    isLoading,
    result,
    error,
    validate,
    validatePostcode,
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
    autoValidate: false,
    onValidationComplete: (result) => {
      if (onServiceAreaCheck) {
        onServiceAreaCheck(result.serviceAvailable, result.travelCharge || 0)
      }
    }
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPostcode(inputValue)
    // Validate with the current input value instead of waiting for state update
    if (inputValue.trim()) {
      validatePostcode(inputValue)
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setInputValue(value)
  }
  
  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />
    if (isStandardArea) return <CheckCircle className="h-5 w-5 text-green-400" />
    if (isExtendedArea) return <AlertTriangle className="h-5 w-5 text-yellow-400" />
    if (result && !serviceAvailable) return <XCircle className="h-5 w-5 text-red-400" />
    return <MapPin className="h-5 w-5 text-purple-400" />
  }
  
  const getStatusColor = () => {
    if (isStandardArea) return 'border-green-500/20 bg-green-500/10'
    if (isExtendedArea) return 'border-yellow-500/20 bg-yellow-500/10'
    if (result && !serviceAvailable) return 'border-red-500/20 bg-red-500/10'
    return 'border-purple-500/20 bg-purple-500/10'
  }
  
  return (
    <Card className={`${className} bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-200">
          <MapPin className="h-5 w-5 text-purple-400" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-gray-300 text-sm">{description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="postcode" className="text-gray-300">
              Your Postcode
            </Label>
            <div className="flex gap-2">
              <Input
                id="postcode"
                type="text"
                placeholder="e.g. SW9 0AA"
                value={inputValue}
                onChange={handleInputChange}
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 flex-1"
                maxLength={8}
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </Button>
            </div>
          </div>
        </form>
        
        {/* Service Area Result */}
        {result && (
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-start gap-3">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="font-medium text-white mb-1">{message}</p>
                
                {distance && (
                  <p className="text-sm text-gray-300 mb-2">
                    Distance from SW9: {formattedDistance}
                  </p>
                )}
                
                {/* Pricing Information */}
                {serviceAvailable && (
                  <div className="space-y-2">
                    {isStandardArea && (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Standard pricing applies - no additional travel charges</span>
                      </div>
                    )}
                    
                    {isExtendedArea && hasTravelCharge && (
                      <div className="flex items-center gap-2 text-sm text-yellow-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Additional {formattedTravelCharge} travel charge applies</span>
                      </div>
                    )}
                    
                    {/* Book Now Button */}
                    {showBookingButton && (
                      <div className="pt-2">
                        <Link href="/booking">
                          <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25">
                            Book Service Now
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Outside Service Area */}
                {result && !serviceAvailable && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-300 mb-2">
                      Please contact us to discuss special arrangements
                    </p>
                    <Button
                      variant="outline"
                      className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10"
                      onClick={() => window.open('tel:08001234567')}
                    >
                      Call Us: 0800 123 4567
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && !result && (
          <Alert className="border-red-500/20 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Service Area Information */}
        {!result && (
          <div className="text-center text-gray-400 text-sm">
            <p>We serve SW9 and surrounding areas within 25 miles</p>
            <p>Standard pricing within 10 miles • Extended areas with travel supplement</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PostcodeChecker