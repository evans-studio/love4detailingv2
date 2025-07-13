'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface AvailableSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  duration: number
  availableCapacity: number
  status: string
}

interface CalendarBookingProps {
  onSlotSelected: (slot: AvailableSlot) => void
  selectedSlot?: AvailableSlot | null
  className?: string
}

interface DayAvailability {
  date: string
  status: 'available' | 'unavailable' | 'fully_booked'
  slotsCount: number
  slots: AvailableSlot[]
}

export default function CalendarBooking({ 
  onSlotSelected, 
  selectedSlot,
  className = ''
}: CalendarBookingProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [monthAvailability, setMonthAvailability] = useState<DayAvailability[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  // Get current month boundaries
  const getMonthBoundaries = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  // Load month availability
  useEffect(() => {
    loadMonthAvailability()
  }, [currentDate])

  // Real-time subscription for slot availability updates
  useEffect(() => {
    console.log('🔔 Setting up real-time subscription for customer booking...')
    
    const subscription = supabase
      .channel('customer_slot_availability')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'available_slots'
      }, (payload) => {
        console.log('🔄 Customer booking: Real-time slot change detected:', payload)
        
        // Refresh availability data when slots change
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
          console.log('📊 Refreshing customer slot availability...')
          loadMonthAvailability()
          
          // If a specific date is selected, refresh those slots too
          if (selectedDate) {
            loadSlotsForDate(selectedDate)
          }
        }
      })
      .subscribe((status: any, err?: any) => {
        console.log('📡 Customer booking real-time status:', status, err)
      })

    return () => {
      console.log('🔌 Unsubscribing customer booking real-time...')
      subscription.unsubscribe()
    }
  }, [selectedDate])

  const loadMonthAvailability = async () => {
    setIsLoading(true)
    try {
      const { start, end } = getMonthBoundaries(currentDate)
      const response = await fetch(`/api/bookings/available-slots?date_start=${start}&date_end=${end}&limit=200`)
      
      if (response.ok) {
        const result = await response.json()
        const slots = result.data?.slots || []
        
        // Group slots by date
        const slotsByDate: Record<string, AvailableSlot[]> = {}
        slots.forEach((slot: any) => {
          const slotDate = slot.date || slot.slot_date
          if (!slotsByDate[slotDate]) {
            slotsByDate[slotDate] = []
          }
          slotsByDate[slotDate].push({
            id: slot.slot_id || slot.id,
            date: slotDate,
            startTime: slot.start_time || slot.startTime,
            endTime: slot.end_time || slot.endTime,
            duration: slot.duration_minutes || slot.duration || 60,
            availableCapacity: slot.is_available ? 1 : 0,
            status: slot.is_available ? 'available' : 'unavailable'
          })
        })

        // Create availability map for the month
        const availability: DayAvailability[] = []
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
          // Fix timezone issues by using local date formatting
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const slots = slotsByDate[dateStr] || []
          
          // Don't show past dates
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          let status: 'available' | 'unavailable' | 'fully_booked' = 'unavailable'
          if (date >= today) {
            if (slots.length > 0) {
              status = 'available'
            } else {
              status = 'unavailable'
            }
          }
          
          availability.push({
            date: dateStr,
            status,
            slotsCount: slots.length,
            slots
          })
        }
        
        setMonthAvailability(availability)
      } else {
        console.error('Failed to load month availability:', response.status, response.statusText)
        setMonthAvailability([])
      }
    } catch (error) {
      console.error('Error loading month availability:', error)
      setMonthAvailability([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load slots for selected date
  const loadSlotsForDate = async (date: string) => {
    setIsLoadingSlots(true)
    try {
      const response = await fetch(`/api/bookings/available-slots?date_start=${date}&date_end=${date}`)
      
      if (response.ok) {
        const result = await response.json()
        const slots = result.data?.slots || []
        
        // Transform API slots to component format
        const transformedSlots = slots.map((slot: any) => ({
          id: slot.slot_id || slot.id,
          date: slot.date || slot.slot_date,
          startTime: slot.start_time || slot.startTime,
          endTime: slot.end_time || slot.endTime,
          duration: slot.duration_minutes || slot.duration || 60,
          availableCapacity: slot.is_available ? 1 : 0,
          status: slot.is_available ? 'available' : 'unavailable'
        }))
        
        setAvailableSlots(transformedSlots)
      } else {
        console.error('Failed to load slots for date:', response.status, response.statusText)
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Error loading slots for date:', error)
      setAvailableSlots([])
    } finally {
      setIsLoadingSlots(false)
    }
  }

  // Handle date selection
  const handleDateSelect = async (date: string) => {
    setSelectedDate(date)
    await loadSlotsForDate(date)
  }

  // Handle slot selection
  const handleSlotSelect = (slot: AvailableSlot) => {
    onSlotSelected(slot)
  }

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDate(null)
    setAvailableSlots([])
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDate(null)
    setAvailableSlots([])
  }

  // Calendar rendering
  const renderCalendar = () => {
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startingDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    
    const calendarDays = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="p-2"></div>
      )
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      // Fix timezone issues by using local date formatting
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const dayAvailability = monthAvailability.find(d => d.date === dateStr)
      const isSelected = selectedDate === dateStr
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
      const isToday = dateStr === todayStr
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
      
      let dayClass = 'p-2 h-12 w-12 rounded-lg cursor-pointer transition-all text-center flex items-center justify-center text-sm font-medium'
      let statusColor = ''
      
      if (isPast) {
        dayClass += ' opacity-30 cursor-not-allowed text-gray-600'
      } else if (isSelected) {
        dayClass += ' bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25'
      } else if (dayAvailability?.status === 'available') {
        dayClass += ' bg-gray-700/50 text-green-400 border border-green-500/30 hover:bg-green-500/20 hover:border-green-400/50'
        statusColor = 'bg-green-400'
      } else if (dayAvailability?.status === 'fully_booked') {
        dayClass += ' bg-gray-700/50 text-red-400 border border-red-500/30 cursor-not-allowed'
        statusColor = 'bg-red-400'
      } else {
        dayClass += ' bg-gray-800/50 text-gray-500 cursor-not-allowed'
        statusColor = 'bg-gray-600'
      }
      
      if (isToday && !isPast) {
        dayClass += ' ring-2 ring-purple-400/30'
      }
      
      calendarDays.push(
        <div key={day} className="relative">
          <div 
            className={dayClass}
            onClick={() => !isPast && dayAvailability?.status === 'available' && handleDateSelect(dateStr)}
          >
            {day}
            {dayAvailability?.status === 'available' && (
              <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${statusColor}`}></div>
            )}
          </div>
        </div>
      )
    }
    
    return (
      <div className="space-y-4">
        {/* Month header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            disabled={isLoading}
            className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold text-purple-200">{monthName}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            disabled={isLoading}
            className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2">{day}</div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>Fully Booked</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
            <span>Unavailable</span>
          </div>
        </div>
      </div>
    )
  }

  // Time slots rendering
  const renderTimeSlots = () => {
    if (!selectedDate) return null
    
    const selectedDay = new Date(selectedDate).toLocaleDateString('default', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-400" />
          <h4 className="font-semibold text-purple-200">Available Times - {selectedDay}</h4>
        </div>
        
        {isLoadingSlots ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
          </div>
        ) : availableSlots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableSlots.map(slot => {
              const isSelected = selectedSlot?.id === slot.id
              
              return (
                <Button
                  key={slot.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`justify-between h-auto p-4 transition-all duration-300 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
                      : 'border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400'
                  }`}
                  onClick={() => handleSlotSelect(slot)}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {slot.startTime}
                    </span>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p>No time slots available for this date</p>
            <p className="text-sm mt-2">Please select a different date</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={`${className} bg-gray-800/50 border-purple-500/20 text-white backdrop-blur-sm`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-200">
          <Calendar className="h-5 w-5 text-purple-400" />
          Select Date & Time
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Calendar */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : (
            renderCalendar()
          )}
        </div>
        
        {/* Time slots */}
        {selectedDate && renderTimeSlots()}
      </CardContent>
    </Card>
  )
}