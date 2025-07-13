'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InfoAlert, ErrorAlert } from '@/components/ui/BrandedAlert'
import { Label } from '@/components/ui/label'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  RotateCcw, 
  X, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react'

interface BookingData {
  id: string
  reference: string
  date: string
  time: string
  endTime?: string
  service: {
    name: string
    priceFormatted: string
  }
  vehicle: {
    displayName: string
  }
  location: string
}

interface AvailableSlot {
  id: string
  slot_date: string
  start_time: string
  duration_minutes: number
  formatted_date: string
  formatted_time: string
}

interface RescheduleModalProps {
  booking: BookingData
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const COMMON_REASONS = [
  'Schedule conflict',
  'Weather concerns', 
  'Emergency situation',
  'Work commitment',
  'Travel plans',
  'Health reasons',
  'Other'
]

export default function RescheduleModal({ 
  booking, 
  isOpen, 
  onClose, 
  onSuccess 
}: RescheduleModalProps) {
  const [step, setStep] = useState(1) // 1: Date/Time, 2: Reason, 3: Confirmation
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [reason, setReason] = useState('')
  const [selectedReason, setSelectedReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Fetch available slots when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableSlots()
    }
  }, [isOpen])

  const fetchAvailableSlots = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Get date range for next 30 days
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + 30)
      
      const startDateStr = today.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]
      
      const url = `/api/bookings/available-slots?start_date=${startDateStr}&end_date=${endDateStr}`
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch available slots')
      }
      
      const data = await response.json()
      if (data.success && data.data?.slots) {
        // Filter out slots in the past and format for display
        const now = new Date()
        const futureSlots = data.data.slots.filter((slot: any) => {
          const slotDateTime = new Date(`${slot.date}T${slot.start_time}:00`)
          return slotDateTime > now
        }).map((slot: any) => ({
          id: slot.slot_id, // API returns slot_id, we map it to id
          slot_date: slot.date,
          start_time: slot.start_time,
          duration_minutes: slot.duration_minutes || 60,
          formatted_date: new Date(slot.date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: slot.start_time
        }))
        
        setAvailableSlots(futureSlots)
      } else {
        setAvailableSlots([])
      }
    } catch (err) {
      console.error('Error fetching available slots:', err)
      setError('Failed to load available time slots. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!selectedSlot) return
    
    try {
      setIsSubmitting(true)
      setError('')
      
      const finalReason = selectedReason === 'Other' ? reason : selectedReason || reason
      
      console.log('🔍 Reschedule request debug:', {
        selectedSlot,
        newSlotId: selectedSlot.id,
        reason: finalReason || 'Customer request'
      })
      
      const response = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newSlotId: selectedSlot.id,
          reason: finalReason || 'Customer request'
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        // Handle authentication/authorization errors with detailed messages
        if (response.status === 403 && result.details) {
          const { bookingOwner, currentUser, suggestion } = result.details
          throw new Error(`Authentication Issue: ${result.error}\n\nSolution: ${suggestion}`)
        }
        
        // Handle slot not found errors with debug info
        if (response.status === 400 && result.debug) {
          console.error('🔍 Slot error debug info:', result.debug)
          throw new Error(`${result.error}\n\nDebug: Requested slot ID ${result.debug.requestedSlotId} not found in database.`)
        }
        
        throw new Error(result.error || 'Failed to submit reschedule request')
      }

      if (result.success) {
        // Success - show confirmation and close
        alert('Reschedule request submitted successfully! You will receive a confirmation email and hear back from us within 24 hours.')
        onSuccess()
        handleClose()
      }
    } catch (err) {
      console.error('Error submitting reschedule request:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit reschedule request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedSlot(null)
    setReason('')
    setSelectedReason('')
    setError('')
    onClose()
  }

  const canProceedToNext = () => {
    switch (step) {
      case 1: return selectedSlot !== null
      case 2: return true // Reason is optional
      case 3: return true
      default: return false
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-500" />
            Reschedule Booking
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  {step > i ? <CheckCircle className="h-4 w-4" /> : i}
                </div>
                {i < 3 && (
                  <div className={`w-12 h-0.5 ${step > i ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Current Booking Info */}
          <InfoAlert>
            <strong>Current Booking:</strong> {booking.service.name} on {booking.date} at {booking.time} for {booking.vehicle.displayName}
          </InfoAlert>

          {error && (
            <ErrorAlert title="Error">
              {error}
            </ErrorAlert>
          )}

          {/* Step 1: Date/Time Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select New Date & Time</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose when you'd like to reschedule your {booking.service.name} service.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading available slots...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableSlots.length === 0 ? (
                    <InfoAlert title="No Available Slots">
                      No available slots found. Please contact us directly to discuss alternative options.
                    </InfoAlert>
                  ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {Object.entries(
                        availableSlots.reduce((acc, slot) => {
                          const dateKey = slot.slot_date
                          if (!acc[dateKey]) {
                            acc[dateKey] = {
                              date: slot.formatted_date,
                              slots: []
                            }
                          }
                          acc[dateKey].slots.push(slot)
                          return acc
                        }, {} as Record<string, { date: string; slots: AvailableSlot[] }>)
                      ).map(([dateKey, { date, slots }]) => (
                        <div key={dateKey} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <CalendarIcon className="h-4 w-4 text-blue-500" />
                            <h4 className="font-medium text-gray-900">{date}</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {slots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className={`
                                  p-2 text-sm border rounded transition-colors
                                  ${selectedSlot?.id === slot.id 
                                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {slot.formatted_time}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Reason Collection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Reason for Rescheduling</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Help us understand why you need to reschedule (optional but helpful).
                </p>
              </div>

              <div className="space-y-3">
                <Label>Common reasons (select one):</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_REASONS.map((commonReason) => (
                    <button
                      key={commonReason}
                      type="button"
                      onClick={() => setSelectedReason(commonReason)}
                      className={`
                        p-2 text-sm border rounded-lg text-left transition-colors
                        ${selectedReason === commonReason 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {commonReason}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedReason === 'Other' || !selectedReason) && (
                <div>
                  <Label htmlFor="customReason">
                    {selectedReason === 'Other' ? 'Please specify:' : 'Or enter your own reason:'}
                  </Label>
                  <textarea
                    id="customReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us why you need to reschedule..."
                    className="w-full mt-1 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && selectedSlot && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Confirm Reschedule Request</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Please review your reschedule request before submitting.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-red-600">Current Booking:</p>
                    <p className="text-sm">{booking.date} at {booking.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">Requested New Time:</p>
                    <p className="text-sm">{selectedSlot.formatted_date} at {selectedSlot.formatted_time}</p>
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <p className="text-sm"><strong>Service:</strong> {booking.service.name}</p>
                  <p className="text-sm"><strong>Vehicle:</strong> {booking.vehicle.displayName}</p>
                  <p className="text-sm"><strong>Location:</strong> {booking.location}</p>
                  {(selectedReason || reason) && (
                    <p className="text-sm"><strong>Reason:</strong> {selectedReason === 'Other' ? reason : selectedReason || reason}</p>
                  )}
                </div>
              </div>

              <InfoAlert title="What happens next">
                <div className="space-y-2">
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Your request will be reviewed by our team</li>
                    <li>• You'll receive a confirmation email immediately</li>
                    <li>• We'll respond within 24 hours with approval or alternative options</li>
                    <li>• Your original booking remains active until approved</li>
                  </ul>
                </div>
              </InfoAlert>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={step === 1 ? handleClose : () => setStep(step - 1)}
              disabled={isSubmitting}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceedToNext() || isLoading}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}