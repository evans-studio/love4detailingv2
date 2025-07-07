'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Star, Info } from 'lucide-react'
import { ServiceRow, ServicePricingRow, VehicleSize } from '@/types/database.types'

interface ServiceSelectorProps {
  services: ServiceRow[]
  pricing: ServicePricingRow[]
  selectedServiceId?: string
  onServiceSelect: (serviceId: string) => void
  selectedVehicleSize?: VehicleSize
}

const VEHICLE_SIZE_LABELS: Record<VehicleSize, string> = {
  small: 'Small Car',
  medium: 'Medium Car', 
  large: 'Large Car',
  extra_large: 'Extra Large Vehicle'
}

export function ServiceSelector({
  services,
  pricing,
  selectedServiceId,
  onServiceSelect,
  selectedVehicleSize = 'medium'
}: ServiceSelectorProps) {
  const [expandedService, setExpandedService] = useState<string | null>(null)

  const getServicePricing = (serviceId: string, vehicleSize: VehicleSize) => {
    return pricing.find(p => p.service_id === serviceId && p.vehicle_size === vehicleSize)
  }

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(0)}`
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours === 0) {
      return `${remainingMinutes}min`
    } else if (remainingMinutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${remainingMinutes}min`
    }
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <Info className="w-12 h-12 mx-auto mb-2" />
          <p>No services available at the moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Service</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select from our professional car detailing services. Prices shown are for {VEHICLE_SIZE_LABELS[selectedVehicleSize].toLowerCase()} vehicles.
        </p>
      </div>

      <div className="grid gap-6">
        {services.map((service) => {
          const servicePricing = getServicePricing(service.id, selectedVehicleSize)
          const isSelected = selectedServiceId === service.id
          const isExpanded = expandedService === service.id

          return (
            <Card 
              key={service.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-purple-600 border-purple-600' 
                  : 'hover:shadow-md border-gray-200'
              }`}
              onClick={() => {
                onServiceSelect(service.id)
                setExpandedService(isExpanded ? null : service.id)
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {service.name}
                        {service.code === 'full_valet' && (
                          <Badge variant="secondary">Most Popular</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">
                      {servicePricing ? formatPrice(servicePricing.price_pence) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {servicePricing ? formatDuration(servicePricing.duration_minutes) : 'TBD'}
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded Service Details */}
              {isExpanded && (
                <CardContent className="border-t bg-gray-50">
                  <div className="space-y-4">
                    {/* Service Features */}
                    <div>
                      <h4 className="font-semibold mb-2">What's Included:</h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        {service.code === 'full_valet' && (
                          <>
                            <div className="flex items-center gap-2 text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>Exterior wash & wax</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>Interior deep clean</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>Wheel & tyre treatment</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>Window cleaning (inside & out)</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>Dashboard & trim conditioning</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>Vacuum & upholstery clean</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Pricing Breakdown by Vehicle Size */}
                    <div>
                      <h4 className="font-semibold mb-2">Pricing by Vehicle Size:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(VEHICLE_SIZE_LABELS).map(([size, label]) => {
                          const sizeTyped = size as VehicleSize
                          const sizePricing = getServicePricing(service.id, sizeTyped)
                          const isCurrentSize = selectedVehicleSize === sizeTyped
                          
                          return (
                            <div 
                              key={size}
                              className={`p-3 rounded-lg border text-center ${
                                isCurrentSize 
                                  ? 'border-purple-600 bg-purple-50' 
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="font-medium text-sm">{label}</div>
                              <div className="text-lg font-bold text-purple-600">
                                {sizePricing ? formatPrice(sizePricing.price_pence) : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sizePricing ? formatDuration(sizePricing.duration_minutes) : ''}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Customer Reviews Preview */}
                    <div className="flex items-center gap-4 pt-4 border-t">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-gray-600">4.9/5 from 150+ customers</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Selection Summary */}
      {selectedServiceId && (
        <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-purple-900">Service Selected</h3>
              <p className="text-purple-700">
                {services.find(s => s.id === selectedServiceId)?.name} for {VEHICLE_SIZE_LABELS[selectedVehicleSize]}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-purple-600">
                {(() => {
                  const pricing = getServicePricing(selectedServiceId, selectedVehicleSize)
                  return pricing ? formatPrice(pricing.price_pence) : 'N/A'
                })()}
              </div>
              <div className="text-sm text-purple-600">
                {(() => {
                  const pricing = getServicePricing(selectedServiceId, selectedVehicleSize)
                  return pricing ? formatDuration(pricing.duration_minutes) : 'TBD'
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceSelector