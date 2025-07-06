'use client'

import { useBookingFlow } from '@/hooks/useBookingFlow'
import { VehicleDetails } from '@/components/booking/VehicleDetails'
import { DateTimeSelection } from '@/components/booking/DateTimeSelection'
import { ContactDetails } from '@/components/booking/ContactDetails'
import { PaymentMethod } from '@/components/booking/PaymentMethod'
import { BookingProgress } from '@/components/booking/BookingProgress'
import { LoadingState } from '@/components/ui/LoadingState'

export default function BookingPage() {
  const {
    currentStep,
    bookingData,
    loading,
    error,
    isSubmitting,
    updateBookingData,
    nextStep,
    previousStep,
    submitBooking,
    getStepTitle,
    getStepDescription,
    getBookingSummary
  } = useBookingFlow()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <LoadingState>Loading booking form...</LoadingState>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#141414]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F2F2F2] mb-2">
            Book Your Full Valet Service
          </h1>
          <p className="text-sm sm:text-base text-[#C7C7C7]">
            {getStepDescription(currentStep)}
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <BookingProgress currentStep={currentStep} totalSteps={4} />
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            {currentStep === 1 && (
              <VehicleDetails
                vehicleData={{
                  registration: bookingData.vehicleRegistration,
                  make: bookingData.vehicleMake,
                  model: bookingData.vehicleModel,
                  year: bookingData.vehicleYear,
                  color: bookingData.vehicleColor,
                  size: bookingData.vehicleSize
                }}
                onSubmit={async (data) => {
                  await updateBookingData(data)
                  nextStep()
                }}
                showPricing={true}
                loading={loading}
              />
            )}

            {currentStep === 2 && (
              <DateTimeSelection
                selectedDate={bookingData.selectedDate}
                selectedSlotId={bookingData.selectedSlotId}
                vehicleSize={bookingData.vehicleSize}
                onSelect={(date, slotId) => {
                  updateBookingData({ selectedDate: date, selectedSlotId: slotId })
                  nextStep()
                }}
                onBack={previousStep}
                loading={loading}
              />
            )}

            {currentStep === 3 && (
              <ContactDetails
                contactData={{
                  name: bookingData.customerName,
                  email: bookingData.customerEmail,
                  phone: bookingData.customerPhone
                }}
                onSubmit={(data) => {
                  updateBookingData({
                    customerName: data.name,
                    customerEmail: data.email,
                    customerPhone: data.phone
                  })
                  nextStep()
                }}
                onBack={previousStep}
                loading={loading}
              />
            )}

            {currentStep === 4 && (
              <PaymentMethod
                selectedMethod={bookingData.paymentMethod}
                bookingSummary={getBookingSummary()}
                onSelect={(method) => updateBookingData({ paymentMethod: method })}
                onConfirm={submitBooking}
                onBack={previousStep}
                loading={isSubmitting}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}