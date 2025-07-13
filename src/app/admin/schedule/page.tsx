'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  CalendarDays,
  Timer,
  Users,
  Edit2,
  Save,
  X
} from 'lucide-react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import WeeklyScheduleManager from '@/components/admin/schedule/WeeklyScheduleManager'
import ScheduleStats from '@/components/admin/schedule/ScheduleStats'
import { supabase } from '@/lib/supabase/client'

interface TimeSlot {
  id: string
  date: string
  startTime: string
  isAvailable: boolean
  bookingId?: string
  bookingReference?: string
  customerName?: string
}


// Generate 30-minute increments from 08:00 to 18:30
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 30) break // Stop at 18:30
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(timeString)
    }
  }
  return slots
}

const TIME_SLOT_OPTIONS = generateTimeSlots()

// All available time options for manual slot creation

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTime(timeString: string): string {
  return timeString.slice(0, 5) // Extract HH:MM
}

function getWeekDates(startDate: Date): Date[] {
  const dates = []
  const start = new Date(startDate)
  
  // Get Monday of the week
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)
  
  // Generate Monday to Friday
  for (let i = 0; i < 5; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date)
  }
  
  return dates
}

export default function AdminSchedulePage() {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [isCreating, setIsCreating] = useState(false)
  const [creatingForDate, setCreatingForDate] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [editTime, setEditTime] = useState<string>('')
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  
  // Calendar-based slot management states
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showBottomPanel, setShowBottomPanel] = useState(false)
  
  // New slot creation states
  const [showTimePickerForDate, setShowTimePickerForDate] = useState<string | null>(null)
  const [selectedNewSlotTime, setSelectedNewSlotTime] = useState<string>('')

  useEffect(() => {
    fetchWeekSlots()
  }, [currentWeek])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  // Real-time subscription for slot changes
  useEffect(() => {
    // Subscribe to changes in available_slots table
    const subscription = supabase
      .channel('available_slots_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'available_slots'
        },
        (payload) => {
          console.log('Real-time slot change:', payload)
          
          // Only refresh if the change affects the current week
          const weekDates = getWeekDates(currentWeek)
          const startDate = weekDates[0].toISOString().split('T')[0]
          const endDate = weekDates[4].toISOString().split('T')[0]
          
          // Check if the changed slot is in current week view
          const newSlot = payload.new as any
          const oldSlot = payload.old as any
          if (newSlot?.slot_date || oldSlot?.slot_date) {
            const changedDate = newSlot?.slot_date || oldSlot?.slot_date
            if (changedDate >= startDate && changedDate <= endDate) {
              // Refresh data when any slot in current week changes
              fetchWeekSlots()
              
              // Show notification for external changes
              if (payload.eventType === 'DELETE') {
                setSuccess('🔄 Slot deleted (external change detected)')
              } else if (payload.eventType === 'INSERT') {
                setSuccess('🔄 New slot added (external change detected)')
              } else if (payload.eventType === 'UPDATE') {
                setSuccess('🔄 Slot updated (external change detected)')
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
      setRealtimeConnected(false)
    }
  }, [currentWeek]) // Re-subscribe when week changes

  // Handle Escape key for dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTimePickerForDate) {
          handleCancelCreateSlot()
        } else if (showBottomPanel) {
          handleCloseDayPanel()
        }
      }
    }

    if (showTimePickerForDate || showBottomPanel) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showTimePickerForDate, showBottomPanel])

  const fetchWeekSlots = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const weekDates = getWeekDates(currentWeek)
      const startDate = weekDates[0].toISOString().split('T')[0]
      const endDate = weekDates[4].toISOString().split('T')[0]
      
      // Call real admin API to fetch slots
      const response = await fetch(`/api/admin/schedule?start_date=${startDate}&end_date=${endDate}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch slots')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch slots')
      }
      
      // Transform API response to component format
      const transformedSlots: TimeSlot[] = data.slots.map((slot: any) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.start_time.substring(0, 5), // Convert HH:MM:SS to HH:MM
        isAvailable: slot.is_available,
        bookingId: slot.booking_id,
        bookingReference: slot.booking_reference,
        customerName: slot.customer_name
      }))
      
      setSlots(transformedSlots)
      
    } catch (err) {
      console.error('Error fetching slots:', err)
      setError('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  const getNextDay = (dateString: string, days: number): string => {
    const date = new Date(dateString)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  const handleCreateSlotForDay = (date: string) => {
    // Open time picker instead of auto-creating slot
    setShowTimePickerForDate(date)
    
    // Find first available time slot for this date
    const usedTimes = getSlotsByDate(date).map(slot => slot.startTime)
    const firstAvailableTime = TIME_SLOT_OPTIONS.find(time => !usedTimes.includes(time))
    setSelectedNewSlotTime(firstAvailableTime || '10:00')
    setError(null)
  }

  const handleConfirmCreateSlot = async () => {
    if (!showTimePickerForDate || !selectedNewSlotTime) return

    setCreatingForDate(showTimePickerForDate)
    setError(null)

    try {
      // Check if slot already exists for this time (validation before API call)
      const existingSlots = getSlotsByDate(showTimePickerForDate)
      const usedTimes = existingSlots.map(slot => slot.startTime)
      
      if (usedTimes.includes(selectedNewSlotTime)) {
        setError(`Slot already exists for ${selectedNewSlotTime}. Please choose a different time.`)
        setCreatingForDate(null)
        return
      }

      // Call real API to create slot with selected time
      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: showTimePickerForDate,
          start_time: selectedNewSlotTime
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create slot')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create slot')
      }
      
      // Create slot data from API response
      const newSlotData: TimeSlot = {
        id: data.data.slot_id,
        date: data.data.slot_date,
        startTime: data.data.start_time.substring(0, 5), // Convert HH:MM:SS to HH:MM
        isAvailable: data.data.is_available
      }
      
      // Update UI after successful API call
      setSlots(prev => [...prev, newSlotData].sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.startTime}`)
        const dateB = new Date(`${b.date} ${b.startTime}`)
        return dateA.getTime() - dateB.getTime()
      }))
      
      setSuccess(`${selectedNewSlotTime} slot added successfully`)
      
      // Close time picker
      setShowTimePickerForDate(null)
      setSelectedNewSlotTime('')
      
    } catch (err) {
      setError('Failed to create slot')
    } finally {
      setCreatingForDate(null)
    }
  }

  const handleCancelCreateSlot = () => {
    setShowTimePickerForDate(null)
    setSelectedNewSlotTime('')
    setError(null)
  }

  // Calendar-based day selection
  const handleDaySelect = (dateString: string) => {
    setSelectedDay(dateString)
    setShowBottomPanel(true)
    setError(null)
  }

  const handleCloseDayPanel = () => {
    setSelectedDay(null)
    setShowBottomPanel(false)
    setEditingSlot(null)
    setEditTime('')
  }

  const handleEditSlot = (slotId: string, currentTime: string) => {
    setEditingSlot(slotId)
    setEditTime(currentTime)
  }

  const handleSaveEdit = async () => {
    if (!editingSlot || !editTime) return

    try {
      setSlots(prev => prev.map(slot => 
        slot.id === editingSlot 
          ? { ...slot, startTime: editTime }
          : slot
      ))
      
      setSuccess(`Time updated to ${editTime}`)
      setEditingSlot(null)
      setEditTime('')
      
    } catch (err) {
      setError('Failed to update slot')
    }
  }

  const handleCancelEdit = () => {
    setEditingSlot(null)
    setEditTime('')
  }

  const handleDeleteSlot = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId)
    if (slot?.bookingId) {
      setError('Cannot delete booked slot')
      return
    }

    try {
      // Call real delete API
      const response = await fetch(`/api/admin/schedule?slot_id=${slotId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete slot')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete slot')
      }
      
      // Update UI after successful API call
      setSlots(prev => prev.filter(s => s.id !== slotId))
      setSuccess('Slot deleted successfully')
      
    } catch (err) {
      console.error('Delete slot error:', err)
      setError('Failed to delete slot')
    }
  }

  const createQuickSlots = async () => {
    try {
      setIsCreating(true)
      setError(null)
      
      const weekDates = getWeekDates(currentWeek)
      const weekStartDate = weekDates[0].toISOString().split('T')[0]
      
      // Define standard time slots for quick creation
      const timeSlots = ['10:00', '14:00', '16:00', '12:00'] // Monday, Tuesday, Thursday, Friday
      
      // Call real API to create weekly slots
      const response = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_weekly_slots',
          week_start_date: weekStartDate,
          time_slots: timeSlots
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create weekly slots')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create weekly slots')
      }
      
      // Refresh the slots from the database to get real data
      await fetchWeekSlots()
      
      setSuccess(`Created ${data.data.slots_created || 0} new slots for the week`)
      
    } catch (err) {
      console.error('Create quick slots error:', err)
      setError('Failed to create quick slots')
    } finally {
      setIsCreating(false)
    }
  }


  const getSlotsByDate = (date: string) => {
    return slots.filter(slot => slot.date === date)
  }

  // Helper functions for date styling
  const isToday = (date: string) => {
    const today = new Date().toISOString().split('T')[0]
    return date === today
  }

  const isPastDay = (date: string) => {
    const today = new Date().toISOString().split('T')[0]
    return date < today
  }

  const getDayCardClassName = (date: string) => {
    const baseClass = "min-h-[300px] transition-all duration-200"
    
    if (isToday(date)) {
      return `${baseClass} ring-2 ring-primary ring-offset-2 shadow-lg`
    }
    
    if (isPastDay(date)) {
      return `${baseClass} opacity-60 bg-muted/30`
    }
    
    return baseClass
  }

  const getDayHeaderClassName = (date: string) => {
    if (isToday(date)) {
      return "text-primary font-semibold"
    }
    
    if (isPastDay(date)) {
      return "text-muted-foreground"
    }
    
    return ""
  }

  const weekDates = getWeekDates(currentWeek)
  const weekSlots = slots.filter(slot => {
    const slotDate = new Date(slot.date)
    const weekStart = weekDates[0]
    const weekEnd = weekDates[4]
    return slotDate >= weekStart && slotDate <= weekEnd
  })

  const statistics = {
    totalSlots: weekSlots.length,
    availableSlots: weekSlots.filter(s => s.isAvailable).length,
    bookedSlots: weekSlots.filter(s => !s.isAvailable).length,
    weekRevenue: weekSlots.filter(s => !s.isAvailable).length * 75 // £75 per slot
  }

  return (
    <AdminLayout title="Schedule Management" subtitle="Configure your working hours and availability">
      <div className="space-y-6 lg:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Schedule Management</h1>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${realtimeConnected ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/60'}`}>
                <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`}></div>
                {realtimeConnected ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>
            <p className="text-muted-foreground">Manage availability and time slots • Real-time sync enabled</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={createQuickSlots}
              disabled={isCreating}
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Quick Setup Week
            </Button>
            <span className="hidden lg:inline text-xs text-muted-foreground">
              Add standard slots to all days
            </span>
          </div>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  const newWeek = new Date(currentWeek)
                  newWeek.setDate(newWeek.getDate() - 7)
                  setCurrentWeek(newWeek)
                }}
              >
                Previous Week
              </Button>
              
              <div className="text-center">
                <h3 className="font-semibold flex items-center justify-center gap-2">
                  Week of {formatDate(weekDates[0].toISOString().split('T')[0])}
                  {weekDates.some(date => isToday(date.toISOString().split('T')[0])) && (
                    <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      CURRENT WEEK
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {weekDates[0].toLocaleDateString('en-GB')} - {weekDates[4].toLocaleDateString('en-GB')}
                </p>
                {/* Week timeline indicator */}
                <div className="flex items-center justify-center gap-2">
                  {weekDates.map((date, index) => {
                    const dateString = date.toISOString().split('T')[0]
                    const dayNames = ['M', 'T', 'W', 'T', 'F']
                    
                    return (
                      <div 
                        key={dateString}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${isToday(dateString) ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1' : isPastDay(dateString) ? 'bg-muted text-muted-foreground opacity-60' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                        title={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][index]} ${date.toLocaleDateString('en-GB')}`}
                      >
                        {dayNames[index]}
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <Button 
                variant="outline"
                onClick={() => {
                  const newWeek = new Date(currentWeek)
                  newWeek.setDate(newWeek.getDate() + 7)
                  setCurrentWeek(newWeek)
                }}
              >
                Next Week
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Slots</p>
                  <p className="text-2xl font-bold">{statistics.totalSlots}</p>
                </div>
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold text-green-400">{statistics.availableSlots}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Booked</p>
                  <p className="text-2xl font-bold text-blue-400">{statistics.bookedSlots}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Week Revenue</p>
                  <p className="text-2xl font-bold text-purple-400">£{statistics.weekRevenue}</p>
                </div>
                <Timer className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}


        {/* Weekly Schedule View - Horizontal Week Grid */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Weekly Schedule Overview</h3>
              <p className="text-sm text-muted-foreground">
                <span className="hidden lg:inline">📅 All 5 days displayed horizontally - no scrolling needed for week management</span>
                <span className="lg:hidden">📱 Tap day headers to add slots quickly - responsive mobile layout</span>
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Booked</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar-Based Schedule Management */}
        <div className="space-y-4">
          {/* Week Calendar View */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Week Calendar - Click any day to manage slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {weekDates.map((date, index) => {
                  const dateString = date.toISOString().split('T')[0]
                  const daySlots = getSlotsByDate(dateString)
                  const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][index]
                  const availableSlots = daySlots.filter(s => s.isAvailable).length
                  const bookedSlots = daySlots.filter(s => !s.isAvailable).length
                  const isSelected = selectedDay === dateString
                  
                  return (
                    <Card 
                      key={dateString}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected 
                          ? 'ring-2 ring-primary bg-primary/5 border-primary' 
                          : isToday(dateString)
                          ? 'ring-1 ring-primary/50 bg-primary/2'
                          : isPastDay(dateString)
                          ? 'opacity-60 hover:opacity-80'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleDaySelect(dateString)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="space-y-2">
                          <div>
                            <h3 className={`font-bold text-sm ${getDayHeaderClassName(dateString)}`}>
                              {dayName}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                            {isToday(dateString) && (
                              <span className="inline-block mt-1 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                                TODAY
                              </span>
                            )}
                          </div>
                          
                          {/* Slot Status Indicators */}
                          <div className="space-y-1">
                            {daySlots.length > 0 ? (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  {daySlots.length} slots
                                </Badge>
                                <div className="flex gap-1 justify-center">
                                  {availableSlots > 0 && (
                                    <Badge className="text-[10px] bg-green-500/20 text-green-300 border-green-400/50">
                                      {availableSlots} free
                                    </Badge>
                                  )}
                                  {bookedSlots > 0 && (
                                    <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-400/50">
                                      {bookedSlots} booked
                                    </Badge>
                                  )}
                                </div>
                              </>
                            ) : (
                              <Badge variant="secondary" className="text-xs opacity-60">
                                No slots
                              </Badge>
                            )}
                          </div>
                          
                          {/* Visual Day Status */}
                          <div className={`w-full h-2 rounded-full ${
                            daySlots.length === 0 
                              ? 'bg-gray-500/20'
                              : availableSlots === daySlots.length
                              ? 'bg-green-500/40'
                              : bookedSlots === daySlots.length
                              ? 'bg-blue-500/40'
                              : 'bg-gradient-to-r from-green-500/40 to-blue-500/40'
                          }`} />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              
              {/* Calendar Navigation Helper */}
              <div className="text-center text-sm text-muted-foreground">
                Click any day above to open slot management panel
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Slide-Up Panel for Day Slot Management */}
        {showBottomPanel && selectedDay && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm">
            <div 
              className="w-full max-w-6xl bg-card border-t border-border rounded-t-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
              style={{ maxHeight: '75vh' }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formatDate(selectedDay)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Manage slots for {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][weekDates.findIndex(date => date.toISOString().split('T')[0] === selectedDay)]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateSlotForDay(selectedDay)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slot
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseDayPanel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Panel Content - Scrollable Slot List */}
              <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
                {(() => {
                  const daySlots = getSlotsByDate(selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime))
                  
                  if (daySlots.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-muted-foreground mb-2">No slots scheduled</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Start by adding your first time slot for this day
                        </p>
                        <Button onClick={() => handleCreateSlotForDay(selectedDay)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Slot
                        </Button>
                      </div>
                    )
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {daySlots.map((slot) => (
                        <Card key={slot.id} className={`transition-all duration-200 ${slot.isAvailable ? 'border-green-500/20 bg-green-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {editingSlot === slot.id ? (
                                  <select 
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="text-sm bg-background border border-border rounded px-2 py-1"
                                  >
                                    {TIME_SLOT_OPTIONS.map(time => (
                                      <option key={time} value={time}>{time}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="font-medium">{formatTime(slot.startTime)}</span>
                                )}
                              </div>
                              <Badge variant={slot.isAvailable ? "default" : "secondary"}>
                                {slot.isAvailable ? 'Available' : 'Booked'}
                              </Badge>
                            </div>
                            
                            {!slot.isAvailable && slot.customerName && (
                              <div className="mb-3 p-2 bg-muted rounded text-sm">
                                <p className="font-medium">{slot.customerName}</p>
                                {slot.bookingReference && (
                                  <p className="text-muted-foreground">Ref: {slot.bookingReference}</p>
                                )}
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              {editingSlot === slot.id ? (
                                <>
                                  <Button size="sm" onClick={handleSaveEdit}>
                                    <Save className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleEditSlot(slot.id, slot.startTime)}
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  {slot.isAvailable && (
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => handleDeleteSlot(slot.id)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Time Picker Dialog for New Slot */}
        {showTimePickerForDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Add New Time Slot
                </CardTitle>
                <CardDescription>
                  Select time for {formatDate(showTimePickerForDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white">Select Time:</label>
                  <select 
                    value={selectedNewSlotTime}
                    onChange={(e) => setSelectedNewSlotTime(e.target.value)}
                    className="w-full mt-1 p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {TIME_SLOT_OPTIONS.map(time => {
                      const usedTimes = getSlotsByDate(showTimePickerForDate).map(slot => slot.startTime)
                      const isUsed = usedTimes.includes(time)
                      return (
                        <option 
                          key={time} 
                          value={time}
                          disabled={isUsed}
                          style={{ 
                            color: isUsed ? '#6b7280' : '#ffffff',
                            backgroundColor: isUsed ? '#374151' : '#1f2937'
                          }}
                        >
                          {time} {isUsed ? '(already scheduled)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleCancelCreateSlot}
                    disabled={creatingForDate !== null}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmCreateSlot}
                    disabled={creatingForDate !== null || !selectedNewSlotTime}
                  >
                    {creatingForDate ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Slot
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}