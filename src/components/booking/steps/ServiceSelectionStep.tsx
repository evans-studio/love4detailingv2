'use client'

import { useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { ServiceCard } from '@/components/services/ServiceCard'
import { getAvailableServices } from '@/lib/config/services'
import type { UnifiedBookingForm } from '@/lib/validation/booking'

interface ServiceSelectionStepProps {
  onNext: () => void
}

export function ServiceSelectionStep({ onNext }: ServiceSelectionStepProps) {
  const {
    watch,
    setValue,
    formState: { errors },
    trigger
  } = useFormContext<UnifiedBookingForm>()

  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [availableServices] = useState(getAvailableServices())

  // Watch form values
  const watchedServiceId = watch('service.serviceId')
  const watchedVehicleSize = watch('vehicle.size') || 'medium'

  // Initialize selected service
  useEffect(() => {
    if (watchedServiceId) {
      setSelectedServiceId(watchedServiceId)
    }
  }, [watchedServiceId])

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId)
    const service = availableServices.find(s => s.id === serviceId)
    if (service) {
      setValue('service.serviceId', serviceId)
      setValue('service.serviceName', service.name)
    }
  }

  // Handle form submission
  const handleNext = async () => {
    const isValid = await trigger(['service.serviceId', 'service.serviceName'])
    if (isValid) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#F2F2F2] mb-4">
          Choose Your Service
        </h2>
        <p className="text-[#C7C7C7] text-lg max-w-2xl mx-auto">
          Select the perfect detailing service for your vehicle. Our premium mobile service comes to you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {availableServices.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            vehicleSize={watchedVehicleSize}
            selected={selectedServiceId === service.id}
            onSelect={handleServiceSelect}
          />
        ))}
      </div>

      {errors.service?.serviceId && (
        <div className="text-center">
          <p className="text-red-400 text-sm">{errors.service.serviceId.message}</p>
        </div>
      )}

      <div className="flex justify-center mt-8">
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedServiceId}
          className="px-8 py-3 bg-[#9146FF] text-white rounded-lg font-medium transition-all duration-200 hover:bg-[#9146FF]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Vehicle Details
        </button>
      </div>
    </div>
  )
}