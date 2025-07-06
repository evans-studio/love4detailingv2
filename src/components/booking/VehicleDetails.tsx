'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { VehicleService } from '@/lib/services/vehicle.service'
import { BookingService } from '@/lib/services/booking.service'
import { VehicleSize } from '@/types/database.types'
import { LoadingState } from '@/components/ui/LoadingState'

interface VehicleDetailsProps {
  vehicleData?: {
    registration?: string
    make?: string
    model?: string
    year?: number
    color?: string
    size?: VehicleSize
  }
  onSubmit: (data: any) => void
  showPricing?: boolean
  loading?: boolean
}

export function VehicleDetails({ 
  vehicleData, 
  onSubmit, 
  showPricing = true,
  loading = false 
}: VehicleDetailsProps) {
  const [registration, setRegistration] = useState(vehicleData?.registration || '')
  const [make, setMake] = useState(vehicleData?.make || '')
  const [model, setModel] = useState(vehicleData?.model || '')
  const [year, setYear] = useState(vehicleData?.year?.toString() || '')
  const [color, setColor] = useState(vehicleData?.color || '')
  const [detectedSize, setDetectedSize] = useState<VehicleSize | undefined>(vehicleData?.size)
  const [pricing, setPricing] = useState<{ price: number; size: VehicleSize; duration: number }>()
  const [detecting, setDetecting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const vehicleService = new VehicleService()
  const bookingService = new BookingService()

  const detectVehicle = async () => {
    if (!make || !model) return

    setDetecting(true)
    try {
      // Detect size from vehicle data
      const size = await vehicleService.detectVehicleSize(make, model)
      setDetectedSize(size)

      // Get pricing for this size
      if (showPricing) {
        const priceData = await bookingService.getServicePriceByVehicleSize(size)
        setPricing({
          price: priceData.price_pence,
          size: size,
          duration: priceData.duration_minutes
        })
      }
    } catch (error) {
      console.error('Failed to detect vehicle size:', error)
      setDetectedSize('medium') // Default fallback
    } finally {
      setDetecting(false)
    }
  }

  useEffect(() => {
    if (make && model) {
      detectVehicle()
    }
  }, [make, model])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!registration.trim()) {
      newErrors.registration = 'Registration number is required'
    } else if (!/^[A-Z0-9\s]+$/i.test(registration)) {
      newErrors.registration = 'Please enter a valid UK registration number'
    }

    if (!make.trim()) {
      newErrors.make = 'Vehicle make is required'
    }

    if (!model.trim()) {
      newErrors.model = 'Vehicle model is required'
    }

    if (year && (isNaN(Number(year)) || Number(year) < 1950 || Number(year) > new Date().getFullYear() + 1)) {
      newErrors.year = 'Please enter a valid year'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    onSubmit({
      vehicleRegistration: registration.toUpperCase(),
      vehicleMake: make,
      vehicleModel: model,
      vehicleYear: year ? parseInt(year) : undefined,
      vehicleColor: color || undefined,
      vehicleSize: detectedSize || 'medium'
    })
  }

  const getSizeLabel = (size: VehicleSize) => {
    return vehicleService.getSizeLabel(size)
  }

  const getSizeDescription = (size: VehicleSize) => {
    return vehicleService.getSizeDescription(size)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingState>Loading vehicle details...</LoadingState>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Vehicle Details</h2>
        <p className="text-gray-600 mb-6">
          Enter your vehicle details to get an accurate price for our Full Valet service
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="registration" className="block text-sm font-medium mb-2">
            Registration Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="registration"
            type="text"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            placeholder="e.g. AB12 CDE"
            className={`uppercase ${errors.registration ? 'border-red-500' : ''}`}
            required
          />
          {errors.registration && (
            <p className="text-red-500 text-sm mt-1">{errors.registration}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="make" className="block text-sm font-medium mb-2">
              Make <span className="text-red-500">*</span>
            </Label>
            <Input
              id="make"
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. Ford"
              className={errors.make ? 'border-red-500' : ''}
              required
            />
            {errors.make && (
              <p className="text-red-500 text-sm mt-1">{errors.make}</p>
            )}
          </div>

          <div>
            <Label htmlFor="model" className="block text-sm font-medium mb-2">
              Model <span className="text-red-500">*</span>
            </Label>
            <Input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Focus"
              className={errors.model ? 'border-red-500' : ''}
              required
            />
            {errors.model && (
              <p className="text-red-500 text-sm mt-1">{errors.model}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="year" className="block text-sm font-medium mb-2">
              Year (Optional)
            </Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2020"
              min="1950"
              max={new Date().getFullYear() + 1}
              className={errors.year ? 'border-red-500' : ''}
            />
            {errors.year && (
              <p className="text-red-500 text-sm mt-1">{errors.year}</p>
            )}
          </div>

          <div>
            <Label htmlFor="color" className="block text-sm font-medium mb-2">
              Color (Optional)
            </Label>
            <Input
              id="color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Blue"
            />
          </div>
        </div>
      </div>

      {detecting && (
        <div className="flex items-center text-sm text-gray-600">
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Detecting vehicle size...
        </div>
      )}

      {detectedSize && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-blue-800">
                Vehicle Size: {getSizeLabel(detectedSize)}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                {getSizeDescription(detectedSize)}
              </p>
            </div>
          </div>
        </div>
      )}

      {detectedSize && pricing && showPricing && (
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-purple-900">Full Valet Service</p>
              <p className="text-sm text-purple-700">
                {getSizeLabel(detectedSize)} • {pricing.duration} minutes
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900">
                £{(pricing.price / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          type="submit" 
          className="flex-1 bg-[#9146FF] hover:bg-[#7c3aed] text-white"
          disabled={!registration || !make || !model || detecting}
        >
          Continue to Date Selection
        </Button>
      </div>
    </form>
  )
}