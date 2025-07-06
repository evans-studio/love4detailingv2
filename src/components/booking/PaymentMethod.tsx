'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { PaymentMethod as PaymentMethodType } from '@/types/database.types'
import { LoadingState } from '@/components/ui/LoadingState'

interface BookingSummary {
  service: string
  vehicle?: string
  registration?: string
  size?: string
  sizeLabel?: string
  price?: number
  formattedPrice?: string
  duration?: number
  date?: string
  customer: {
    name?: string
    email?: string
    phone?: string
  }
  paymentMethod?: PaymentMethodType
}

interface PaymentMethodProps {
  selectedMethod?: PaymentMethodType
  bookingSummary: BookingSummary
  onSelect: (method: PaymentMethodType) => void
  onConfirm: () => Promise<string | null>
  onBack: () => void
  loading?: boolean
}

const paymentMethods = [
  {
    id: 'cash' as PaymentMethodType,
    name: 'Cash Payment',
    description: 'Pay with cash on the day of service',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    available: true,
    note: 'Payment due on completion of service'
  },
  {
    id: 'card' as PaymentMethodType,
    name: 'Card Payment',
    description: 'Pay with debit or credit card',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    available: false,
    note: 'Coming soon - card payment option'
  },
  {
    id: 'bank_transfer' as PaymentMethodType,
    name: 'Bank Transfer',
    description: 'Pay via bank transfer before service',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    available: false,
    note: 'Contact us for bank transfer details'
  }
]

export function PaymentMethod({
  selectedMethod,
  bookingSummary,
  onSelect,
  onConfirm,
  onBack,
  loading = false
}: PaymentMethodProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!selectedMethod) {
      setError('Please select a payment method')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await onConfirm()
      if (!result) {
        setError('Failed to create booking. Please try again.')
      }
    } catch (error) {
      console.error('Error confirming booking:', error)
      setError('An error occurred while creating your booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not selected'
    
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingState>Loading payment options...</LoadingState>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Payment & Confirmation</h2>
        <p className="text-gray-600 mb-6">
          Review your booking details and choose your payment method
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Booking Summary */}
      <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
        <h3 className="font-semibold text-lg mb-4 text-gray-900">Booking Summary</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">{bookingSummary.service}</span>
          </div>
          
          {bookingSummary.vehicle && (
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle:</span>
              <span className="font-medium">{bookingSummary.vehicle}</span>
            </div>
          )}
          
          {bookingSummary.registration && (
            <div className="flex justify-between">
              <span className="text-gray-600">Registration:</span>
              <span className="font-medium">{bookingSummary.registration}</span>
            </div>
          )}
          
          {bookingSummary.sizeLabel && (
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle Size:</span>
              <span className="font-medium">{bookingSummary.sizeLabel}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">{formatDate(bookingSummary.date)}</span>
          </div>
          
          {bookingSummary.duration && (
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{bookingSummary.duration} minutes</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-600">Customer:</span>
            <span className="font-medium">{bookingSummary.customer.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{bookingSummary.customer.email}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span className="font-medium">{bookingSummary.customer.phone}</span>
          </div>
          
          <hr className="my-3 border-gray-300" />
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span className="text-[#9146FF]">{bookingSummary.formattedPrice || '£0.00'}</span>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <Label className="block text-sm font-medium mb-3">
          Select Payment Method <span className="text-red-500">*</span>
        </Label>
        
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedMethod === method.id
                  ? 'border-[#9146FF] bg-[#9146FF]/5'
                  : method.available
                  ? 'border-gray-200 hover:border-gray-300'
                  : 'border-gray-100 bg-gray-50'
              } ${!method.available ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={() => method.available && onSelect(method.id)}
            >
              <div className="flex items-start">
                <div className={`flex-shrink-0 mr-3 ${
                  selectedMethod === method.id ? 'text-[#9146FF]' : 'text-gray-400'
                }`}>
                  {method.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="font-medium text-gray-900">{method.name}</h4>
                    {!method.available && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        Not Available
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{method.note}</p>
                </div>
                {method.available && (
                  <div className={`flex-shrink-0 ml-3 ${
                    selectedMethod === method.id ? 'text-[#9146FF]' : 'text-gray-300'
                  }`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="terms-consent"
            className="mt-0.5 mr-3 h-4 w-4 text-[#9146FF] border-gray-300 rounded focus:ring-[#9146FF]"
            required
          />
          <div>
            <label htmlFor="terms-consent" className="text-sm font-medium text-blue-900 cursor-pointer">
              I agree to the terms and conditions
            </label>
            <p className="text-sm text-blue-700 mt-1">
              By confirming this booking, you agree to our terms of service and cancellation policy. 
              Cancellations must be made at least 24 hours in advance.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
          disabled={isSubmitting}
        >
          Back to Contact Details
        </Button>
        <Button 
          type="button"
          onClick={handleConfirm}
          disabled={!selectedMethod || isSubmitting}
          className="flex-1 bg-[#9146FF] hover:bg-[#7c3aed] text-white"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Booking...
            </div>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  )
}