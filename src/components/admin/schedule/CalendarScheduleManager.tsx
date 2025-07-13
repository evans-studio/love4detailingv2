'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  CalendarDays,
  Timer,
  User
} from 'lucide-react'

interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  slot_status: 'available' | 'booked' | 'blocked'
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  booking_reference?: string
}

interface DayOverview {
  day_date: string
  day_name: string
  is_working_day: boolean
  total_slots: number
  available_slots: number
  booked_slots: number
}

export default function CalendarScheduleManager() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [weekOverview, setWeekOverview] = useState<DayOverview[]>([])
  const [daySlots, setDaySlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  
  // Form state for adding new slots
  const [newSlotForm, setNewSlotForm] = useState({
    start_time: '09:00',
    duration_minutes: 120
  })

  // Helper function to convert API slots to week overview
  const generateWeekOverviewFromSlots = (slots: any[], weekStart: string) => {
    const weekData: DayOverview[] = []
    const startDate = new Date(weekStart)
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      const daySlots = slots.filter(slot => slot.date === dateStr)
      const totalSlots = daySlots.length
      const availableSlots = daySlots.filter(slot => slot.slot_status === 'available').length
      const bookedSlots = daySlots.filter(slot => slot.slot_status === 'booked').length
      
      weekData.push({
        day_date: dateStr,
        day_name: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        is_working_day: totalSlots > 0,
        total_slots: totalSlots,
        available_slots: availableSlots,
        booked_slots: bookedSlots
      })
    }
    
    return weekData
  }

  // Load week overview
  useEffect(() => {
    loadWeekOverview()
  }, [currentDate])

  const loadWeekOverview = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const monday = getMonday(currentDate)
      const weekStart = monday.toISOString().split('T')[0]
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      const weekEnd = sunday.toISOString().split('T')[0]
      
      // Use the working admin schedule API with date range
      const response = await fetch(`/api/admin/schedule?start_date=${weekStart}&end_date=${weekEnd}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.slots) {
          // Convert slots data to week overview format
          const weekData = generateWeekOverviewFromSlots(result.slots, weekStart)
          setWeekOverview(weekData)
        } else {
          setWeekOverview([])
        }
      } else {
        throw new Error('Failed to load week overview')
      }
    } catch (err) {
      console.error('Error loading week overview:', err)
      setError(err instanceof Error ? err.message : 'Failed to load week overview')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDaySlots = async (date: string) => {
    setIsLoadingSlots(true)
    setError(null)
    try {
      // Use the working admin schedule API with single date
      const response = await fetch(`/api/admin/schedule?start_date=${date}&end_date=${date}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.slots) {
          // Convert API slots to component format using simplified slot_status
          const daySlots = result.slots.map(slot => ({
            id: slot.id,
            slot_date: slot.date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            slot_status: slot.slot_status,
            customer_name: slot.customer_name,
            customer_email: slot.customer_email,
            customer_phone: slot.customer_phone,
            booking_reference: slot.booking_reference
          }))
          setDaySlots(daySlots)
        } else {
          setDaySlots([])
        }
      } else {
        throw new Error('Failed to load day slots')
      }
    } catch (err) {
      console.error('Error loading day slots:', err)
      setError(err instanceof Error ? err.message : 'Failed to load day slots')
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const addTimeSlot = async () => {
    if (!selectedDate) return
    
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/admin/slots/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create',
          slotDate: selectedDate,
          startTime: newSlotForm.start_time + ':00',
          durationMinutes: newSlotForm.duration_minutes
        })
      })
      
      if (response.ok) {
        setSuccess('Time slot added successfully')
        await loadDaySlots(selectedDate)
        await loadWeekOverview()
        setNewSlotForm({
          start_time: '09:00',
          duration_minutes: 120
        })
      } else {
        const { error } = await response.json()
        throw new Error(error || 'Failed to add time slot')
      }
    } catch (err) {
      console.error('Error adding time slot:', err)
      setError(err instanceof Error ? err.message : 'Failed to add time slot')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTimeSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return
    
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/admin/slots/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          slotId: slotId,
          slotDate: selectedDate || new Date().toISOString().split('T')[0],
          startTime: '09:00:00',
          durationMinutes: 120
        })
      })
      
      if (response.ok) {
        setSuccess('Time slot deleted successfully')
        if (selectedDate) {
          await loadDaySlots(selectedDate)
        }
        await loadWeekOverview()
      } else {
        const { error } = await response.json()
        throw new Error(error || 'Failed to delete time slot')
      }
    } catch (err) {
      console.error('Error deleting time slot:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete time slot')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date)
    await loadDaySlots(date)
  }

  const getMonday = (date: Date): Date => {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(date.setDate(diff))
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
    setSelectedDate(null)
    setDaySlots([])
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
    setSelectedDate(null)
    setDaySlots([])
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // Extract HH:MM
  }

  const getSlotStatusColor = (slot: TimeSlot) => {
    if (slot.slot_status === 'blocked') return 'bg-red-500/20 text-red-300 border-red-400/30'
    if (slot.slot_status === 'booked') return 'bg-blue-500/20 text-blue-300 border-blue-400/30'
    return 'bg-green-500/20 text-green-300 border-green-400/30'
  }

  const getSlotStatusText = (slot: TimeSlot) => {
    if (slot.slot_status === 'blocked') return 'Blocked'
    if (slot.slot_status === 'booked') return 'Booked'
    return 'Available'
  }

  const getDayStatusColor = (day: DayOverview) => {
    if (!day.is_working_day) return 'bg-white/10 text-white/60'
    if (day.available_slots === 0) return 'bg-red-500/20 text-red-300'
    if (day.booked_slots > 0) return 'bg-blue-500/20 text-blue-300'
    return 'bg-green-500/20 text-green-300'
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Week Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Week Overview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {getMonday(currentDate).toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekOverview.map((day) => (
                <div key={day.day_date} className="text-center">
                  <div className="text-sm font-medium text-white/70 mb-2">
                    {day.day_name.slice(0, 3)}
                  </div>
                  <div className="text-sm text-white/70 mb-2">
                    {new Date(day.day_date).getDate()}
                  </div>
                  <Button
                    variant={selectedDate === day.day_date ? "default" : "outline"}
                    size="sm"
                    className={`w-full h-16 flex flex-col items-center justify-center ${getDayStatusColor(day)}`}
                    onClick={() => handleDateSelect(day.day_date)}
                  >
                    <div className="text-xs">
                      {day.total_slots} slots
                    </div>
                    <div className="text-xs">
                      {day.available_slots} free
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Detail */}
      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Slots for {new Date(selectedDate).toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : daySlots.length > 0 ? (
                <div className="space-y-3">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg hover:bg-white/15 transition-all duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-base">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </span>
                          <Badge className={getSlotStatusColor(slot)}>
                            {getSlotStatusText(slot)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="font-medium">Status: {getSlotStatusText(slot)}</span>
                          </span>
                        </div>
                        {slot.slot_status === 'booked' && slot.customer_name && (
                          <div className="mt-3 p-2 bg-primary/20 rounded-lg border border-primary/30">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-white">{slot.customer_name}</span>
                            </div>
                            {slot.booking_reference && (
                              <div className="text-xs text-white/70 mt-1">
                                Ref: {slot.booking_reference}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTimeSlot(slot.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted" />
                  <p>No time slots for this date</p>
                  <p className="text-sm">Add a time slot to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Time Slot Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Time Slot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newSlotForm.start_time}
                  onChange={(e) => setNewSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  min="30"
                  max="480"
                  step="30"
                  value={newSlotForm.duration_minutes}
                  onChange={(e) => setNewSlotForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 120 }))}
                />
              </div>
              
              
              <Button
                onClick={addTimeSlot}
                disabled={isLoading || !selectedDate}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}