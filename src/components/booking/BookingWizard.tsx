'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Circle } from 'lucide-react'
import { BookingStep, BookingDraft } from '@/types/database.types'
import { useBookingStore } from '@/stores/bookingStore'

interface BookingWizardProps {
  children: React.ReactNode
  currentStep: BookingStep
  className?: string
}

const STEPS: Array<{
  id: BookingStep
  label: string
  description: string
  path: string
}> = [
  {
    id: 'services',
    label: 'Service Selection',
    description: 'Choose your service',
    path: '/booking/services'
  },
  {
    id: 'vehicle',
    label: 'Vehicle Details',
    description: 'Add your vehicle info',
    path: '/booking/vehicle'
  },
  {
    id: 'schedule',
    label: 'Schedule',
    description: 'Pick date & time',
    path: '/booking/schedule'
  },
  {
    id: 'payment',
    label: 'Payment',
    description: 'Complete your booking',
    path: '/booking/payment'
  },
  {
    id: 'confirmation',
    label: 'Confirmation',
    description: 'Booking confirmed',
    path: '/booking/confirmation'
  }
]

export function BookingWizard({ children, currentStep, className }: BookingWizardProps) {
  const router = useRouter()
  const { booking, updateBookingStep } = useBookingStore()
  
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep)
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  const isStepCompleted = (stepId: BookingStep): boolean => {
    const stepIndex = STEPS.findIndex(step => step.id === stepId)
    return stepIndex < currentStepIndex
  }

  const isStepCurrent = (stepId: BookingStep): boolean => {
    return stepId === currentStep
  }

  const isStepAccessible = (stepId: BookingStep): boolean => {
    const stepIndex = STEPS.findIndex(step => step.id === stepId)
    return stepIndex <= currentStepIndex
  }

  const handleStepClick = (step: typeof STEPS[0]) => {
    if (isStepAccessible(step.id)) {
      updateBookingStep(step.id, {})
      router.push(step.path)
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Book Your Service</h1>
            <div className="text-sm text-gray-600">
              Step {currentStepIndex + 1} of {STEPS.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <Progress value={progress} className="mb-6" />
          
          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => handleStepClick(step)}
                  disabled={!isStepAccessible(step.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    isStepCompleted(step.id)
                      ? 'bg-green-500 text-white'
                      : isStepCurrent(step.id)
                      ? 'bg-purple-600 text-white'
                      : isStepAccessible(step.id)
                      ? 'border-2 border-gray-300 text-gray-400 hover:border-purple-300'
                      : 'border-2 border-gray-200 text-gray-300'
                  }`}
                >
                  {isStepCompleted(step.id) ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>
                <div className="text-center">
                  <div className={`text-sm font-medium ${
                    isStepCurrent(step.id) ? 'text-purple-600' : 'text-gray-600'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-400 hidden sm:block">
                    {step.description}
                  </div>
                </div>
                
                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className={`hidden md:block w-full h-0.5 mt-4 ${
                    isStepCompleted(step.id) ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </div>

      {/* Footer with booking summary */}
      {booking && currentStep !== 'confirmation' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {booking.pricing && (
                  <span>Estimated Total: £{booking.pricing.total}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.back()}>
                  Back
                </Button>
                {currentStep !== 'confirmation' && (
                  <Button onClick={() => {
                    const nextStepIndex = currentStepIndex + 1
                    if (nextStepIndex < STEPS.length) {
                      const nextStep = STEPS[nextStepIndex]
                      updateBookingStep(nextStep.id, {})
                      router.push(nextStep.path)
                    }
                  }}>
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingWizard