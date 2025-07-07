'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { BookingService } from '@/lib/services/booking.service'
import { VehicleSize } from '@/types/database.types'
import { LoadingState } from '@/components/ui/LoadingState'

interface TimeSlot {
  slot_id: string
  slot_date: string
  start_time: string
  end_time: string
  available: boolean
  current_bookings: number
  max_bookings: number
}

interface DateTimeSelectionProps {
  selectedDate?: string
  selectedSlotId?: string
  vehicleSize?: VehicleSize
  onSelect: (date: string, slotId: string) => void
  onBack: () => void
  loading?: boolean
}

export function DateTimeSelection({
  selectedDate,
  selectedSlotId,
  vehicleSize,
  onSelect,
  onBack,
  loading = false
}: DateTimeSelectionProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDateState, setSelectedDateState] = useState(selectedDate || '')
  const [error, setError] = useState<string | null>(null)

  const bookingService = new BookingService()

  // Generate next 14 days for date selection
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      // Skip Sundays (day 0)
      if (date.getDay() !== 0) {
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })
        })
      }
    }
    
    return dates
  }

  const loadSlotsForDate = async (date: string) => {
    if (!date) return

    setLoadingSlots(true)
    setError(null)

    try {
      const slots = await bookingService.getAvailableSlots(date)
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Error loading slots:', error)
      setError('Failed to load available time slots. Please try again.')
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    if (selectedDateState) {
      loadSlotsForDate(selectedDateState)
    }
  }, [selectedDateState])

  const handleDateChange = (date: string) => {
    setSelectedDateState(date)
    setAvailableSlots([])
  }

  const handleSlotSelect = (slotId: string) => {
    if (selectedDateState) {
      onSelect(selectedDateState, slotId)
    }
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingState>Loading date selection...</LoadingState>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Select Date & Time</h2>
        <p className="text-gray-600 mb-6">
          Choose your preferred date and time for your Full Valet service
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Date Selection */}
      <div>
        <Label className="block text-sm font-medium mb-3">
          Select Date <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {getAvailableDates().map((date) => (
            <button
              key={date.value}
              type="button"
              onClick={() => handleDateChange(date.value)}
              className={`p-3 text-left border rounded-lg transition-colors ${
                selectedDateState === date.value
                  ? 'border-[#9146FF] bg-[#9146FF]/10 text-[#9146FF]'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{date.label}</div>
              <div className="text-sm text-gray-500">{date.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedDateState && (
        <div>
          <Label className="block text-sm font-medium mb-3">
            Select Time <span className="text-red-500">*</span>
          </Label>
          
          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <LoadingState>Loading available times...</LoadingState>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableSlots.map((slot) => (
                <button
                  key={slot.slot_id}
                  type="button"
                  onClick={() => handleSlotSelect(slot.slot_id)}
                  disabled={!slot.available}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedSlotId === slot.slot_id
                      ? 'border-[#9146FF] bg-[#9146FF]/10 text-[#9146FF]'
                      : slot.available
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium">
                    {formatTimeRange(slot.start_time, slot.end_time)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {slot.available ? 'Available' : 'Booked'}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No available time slots for this date.</p>
              <p className="text-sm">Please select a different date.</p>
            </div>
          )}
        </div>
      )}

      {/* Service Duration Info */}
      {vehicleSize && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Service Duration</p>
              <p className="text-sm text-blue-700">
                Full Valet service typically takes 
                {vehicleSize === 'small' && ' 1.5 hours'}
                {vehicleSize === 'medium' && ' 2 hours'}
                {vehicleSize === 'large' && ' 2.5 hours'}
                {vehicleSize === 'extra_large' && ' 3 hours'}
                {' '}for {vehicleSize} vehicles
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
        >
          Back to Vehicle Details
        </Button>
        <Button 
          type="button"
          onClick={() => selectedSlotId && handleSlotSelect(selectedSlotId)}
          disabled={!selectedDateState || !selectedSlotId}
          className="flex-1 bg-[#9146FF] hover:bg-[#7c3aed] text-white"
        >
          Continue to Contact Details
        </Button>
      </div>
    </div>
  )
}