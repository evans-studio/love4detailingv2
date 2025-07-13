'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Star, 
  Clock, 
  CheckCircle, 
  Info,
  Sparkles,
  Car,
  Shield
} from 'lucide-react'
import { fetchActiveServices, Service, getServicePricing, calculateTotalPrice } from '@/lib/config/services'

interface ServiceSelectionProps {
  selectedService: Service | null
  onServiceSelect: (service: Service) => void
  vehicleSize?: string
  className?: string
}

export function ServiceSelection({ 
  selectedService, 
  onServiceSelect, 
  vehicleSize = 'medium',
  className = '' 
}: ServiceSelectionProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load services on component mount
  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const activeServices = await fetchActiveServices()
      setServices(activeServices)
      
      // Auto-select first service if none selected
      if (!selectedService && activeServices.length > 0) {
        onServiceSelect(activeServices[0])
      }
      
    } catch (err) {
      console.error('Error loading services:', err)
      setError('Failed to load services. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  // Get service icon based on service code or name
  const getServiceIcon = (service: Service) => {
    const serviceName = service.name.toLowerCase()
    if (serviceName.includes('premium') || serviceName.includes('luxury')) {
      return Star
    } else if (serviceName.includes('basic') || serviceName.includes('standard')) {
      return Car
    } else if (serviceName.includes('protection') || serviceName.includes('ceramic')) {
      return Shield
    } else {
      return Sparkles
    }
  }

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} mins`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    if (remainingMins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    }
    return `${hours}h ${remainingMins}m`
  }

  // Get pricing info for a service
  const getPricingInfo = (service: Service) => {
    const pricing = getServicePricing(service, vehicleSize)
    if (!pricing) {
      return {
        price: 'Price on request',
        duration: formatDuration(service.base_duration_minutes),
        available: false
      }
    }
    
    return {
      price: `£${(pricing.price_pence / 100).toFixed(2)}`,
      duration: formatDuration(pricing.duration_minutes),
      available: true
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card className={`bg-gray-800/50 border-purple-500/20 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-200">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Select Your Service
          </CardTitle>
          <CardDescription className="text-gray-300">
            Choose the perfect detailing service for your vehicle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading available services...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`bg-gray-800/50 border-purple-500/20 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-200">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Select Your Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-500/20 bg-red-500/10">
            <Info className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={loadServices}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // No services available
  if (services.length === 0) {
    return (
      <Card className={`bg-gray-800/50 border-purple-500/20 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-200">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Select Your Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <Info className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              No services are currently available. Please contact us directly to book.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-200">
          <Sparkles className="h-5 w-5 text-purple-400" />
          Select Your Service
        </CardTitle>
        <CardDescription className="text-gray-300">
          Choose the perfect detailing service for your {vehicleSize} vehicle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          {services.map((service) => {
            const Icon = getServiceIcon(service)
            const isSelected = selectedService?.id === service.id
            const pricingInfo = getPricingInfo(service)

            return (
              <Card 
                key={service.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isSelected 
                    ? 'ring-2 ring-purple-400 border-purple-400 bg-purple-600/20 shadow-lg shadow-purple-500/25' 
                    : 'border-gray-600 hover:border-purple-500/50 bg-gray-700/50 hover:bg-gray-700/70'
                } ${!pricingInfo.available ? 'opacity-60' : ''}`}
                onClick={() => pricingInfo.available && onServiceSelect(service)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-purple-500' : 'bg-purple-600/30'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          isSelected ? 'text-white' : 'text-purple-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold text-lg ${
                            isSelected ? 'text-purple-200' : 'text-white'
                          }`}>
                            {service.name}
                          </h3>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-purple-400" />
                          )}
                        </div>
                        
                        <p className={`text-sm mb-3 ${
                          isSelected ? 'text-purple-100' : 'text-gray-300'
                        }`}>
                          {service.short_description || service.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-purple-400" />
                            <span className="text-gray-300">{pricingInfo.duration}</span>
                          </div>
                          
                          <div className={`font-bold text-lg ${
                            isSelected ? 'text-purple-200' : 'text-white'
                          }`}>
                            {pricingInfo.price}
                          </div>
                        </div>
                        
                        {!pricingInfo.available && (
                          <Badge variant="secondary" className="mt-2 bg-gray-600 text-gray-300">
                            Not available for {vehicleSize} vehicles
                          </Badge>
                        )}
                        
                        {/* Service features */}
                        {service.features && service.features.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1">
                              {service.features.slice(0, 3).map((feature, index) => (
                                <Badge 
                                  key={index}
                                  variant="secondary" 
                                  className={`text-xs ${
                                    isSelected 
                                      ? 'bg-purple-500/30 text-purple-200' 
                                      : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  {feature}
                                </Badge>
                              ))}
                              {service.features.length > 3 && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    isSelected 
                                      ? 'bg-purple-500/30 text-purple-200' 
                                      : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  +{service.features.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {selectedService && (
          <Alert className="mt-4 border-green-500/20 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              <span className="font-medium">{selectedService.name}</span> selected for your {vehicleSize} vehicle
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default ServiceSelection