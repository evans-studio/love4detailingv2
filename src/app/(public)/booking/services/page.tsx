'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import BookingWizard from '@/components/booking/BookingWizard'
import ServiceSelector from '@/components/booking/ServiceSelector'
import { useBookingStore } from '@/stores/bookingStore'
import { ServiceRow, ServicePricingRow, VehicleSize } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'

export default function BookingServicesPage() {
  const router = useRouter()
  const { booking, updateServiceSelection, initializeBooking, setError, setLoading } = useBookingStore()
  
  const [services, setServices] = useState<ServiceRow[]>([])
  const [pricing, setPricing] = useState<ServicePricingRow[]>([])
  const [selectedVehicleSize, setSelectedVehicleSize] = useState<VehicleSize>('medium')
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setLocalError] = useState<string | null>(null)

  // Initialize booking on mount
  useEffect(() => {
    if (!booking) {
      initializeBooking()
    }
  }, [booking, initializeBooking])

  // Fetch services and pricing data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true)
        setLocalError(null)
        
        const supabase = createClient()
        
        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('code')

        if (servicesError) throw servicesError

        // Fetch pricing
        const { data: pricingData, error: pricingError } = await supabase
          .from('service_pricing')
          .select('*')
          .eq('is_active', true)

        if (pricingError) throw pricingError

        setServices(servicesData || [])
        setPricing(pricingData || [])

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load services'
        setLocalError(errorMessage)
        setError(errorMessage)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [setError])

  const handleServiceSelect = (serviceId: string) => {
    updateServiceSelection(serviceId)
  }

  const handleContinue = () => {
    if (!booking?.serviceId) {
      setLocalError('Please select a service to continue')
      return
    }

    router.push('/booking/vehicle')
  }

  const handleVehicleSizeChange = (size: VehicleSize) => {
    setSelectedVehicleSize(size)
  }

  if (isLoadingData) {
    return (
      <BookingWizard currentStep="services">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Loading services...</p>
          </div>
        </div>
      </BookingWizard>
    )
  }

  if (error || localError) {
    return (
      <BookingWizard currentStep="services">
        <Alert variant="destructive">
          <AlertDescription>
            {error || localError}
          </AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </BookingWizard>
    )
  }

  return (
    <BookingWizard currentStep="services">
      <div className="space-y-8">
        {/* Vehicle Size Selector */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">What size is your vehicle?</h3>
          <p className="text-gray-600 mb-4">
            This helps us show you accurate pricing and duration estimates.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 'small' as VehicleSize, label: 'Small Car', examples: 'Aygo, Fiesta, Polo' },
              { value: 'medium' as VehicleSize, label: 'Medium Car', examples: 'Golf, Focus, Civic' },
              { value: 'large' as VehicleSize, label: 'Large Car', examples: 'BMW 5 Series, Passat' },
              { value: 'extra_large' as VehicleSize, label: 'Extra Large', examples: 'X5, Transit, Sprinter' }
            ].map((size) => (
              <button
                key={size.value}
                onClick={() => handleVehicleSizeChange(size.value)}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  selectedVehicleSize === size.value
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{size.label}</div>
                <div className="text-sm text-gray-500 mt-1">{size.examples}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Service Selector */}
        <ServiceSelector
          services={services}
          pricing={pricing}
          selectedServiceId={booking?.serviceId}
          selectedVehicleSize={selectedVehicleSize}
          onServiceSelect={handleServiceSelect}
        />

        {/* Continue Button */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
          
          <Button 
            onClick={handleContinue}
            disabled={!booking?.serviceId}
            size="lg"
          >
            Continue to Vehicle Details
          </Button>
        </div>
      </div>
    </BookingWizard>
  )
}