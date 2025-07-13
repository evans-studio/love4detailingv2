'use client'

/**
 * Simplified Schedule Manager
 * Clean React patterns with minimal state management
 * Eliminates circular dependencies and infinite loops
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Plus, Trash2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Simple local types
interface DayOverview {
  day_date: string
  day_name: string
  is_working_day: boolean
  total_slots: number
  available_slots: number
  booked_slots: number
}

interface DaySlot {
  slot_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  max_bookings: number
  current_bookings: number
  is_available: boolean
}

interface AddSlotFormData {
  slot_date: string
  start_time: string
  duration_minutes: number
  max_bookings: number
}

// Simple day card component
const SimpleDayCard = React.memo<{
  day: DayOverview
  isSelected: boolean
  onSelect: (date: string) => void
  onToggleWorkingDay: (date: string, isWorking: boolean) => Promise<void>
  isToggling: boolean
}>(({ day, isSelected, onSelect, onToggleWorkingDay, isToggling }) => {
  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  const getStatusColor = useCallback((available: number, total: number) => {
    if (total === 0) return 'bg-muted text-muted-foreground border-muted'
    const ratio = available / total
    if (ratio > 0.7) return 'bg-green-50 text-green-700 border-green-200'
    if (ratio > 0.3) return 'bg-orange-50 text-orange-700 border-orange-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }, [])

  const handleToggle = useCallback(async (checked: boolean) => {
    await onToggleWorkingDay(day.day_date, checked)
  }, [day.day_date, onToggleWorkingDay])

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/50",
        isToggling && "opacity-60 pointer-events-none"
      )}
      onClick={() => !isToggling && onSelect(day.day_date)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{day.day_name}</h3>
            <p className="text-sm text-muted-foreground">{formatDate(day.day_date)}</p>
          </div>
          
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {isToggling && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
            <input
              type="checkbox"
              checked={day.is_working_day}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={isToggling}
              className="w-4 h-4"
            />
          </div>
        </div>

        <div className="space-y-2">
          {day.is_working_day ? (
            <>
              <Badge className={cn("text-xs", getStatusColor(day.available_slots, day.total_slots))}>
                {day.available_slots}/{day.total_slots} available
              </Badge>
              {day.booked_slots > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {day.booked_slots} booked
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="secondary" className="text-xs text-muted-foreground">
              Not working
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

SimpleDayCard.displayName = 'SimpleDayCard'

// Main component
export default function SimplifiedScheduleManager() {
  // Local state only - no complex state management
  const [weekOverview, setWeekOverview] = useState<DayOverview[]>([])
  const [daySlots, setDaySlots] = useState<DaySlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [togglingDays, setTogglingDays] = useState<Set<string>>(new Set())
  const [deletingSlots, setDeletingSlots] = useState<Set<string>>(new Set())
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  
  // Form state
  const [addSlotForm, setAddSlotForm] = useState<AddSlotFormData>({
    slot_date: '',
    start_time: '',
    duration_minutes: 120,
    max_bookings: 1,
  })

  // Error management
  const addError = useCallback((error: string) => {
    setErrors(prev => [...prev, error])
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e !== error))
    }, 5000)
  }, [])

  // API calls - direct fetch, no complex store patterns
  const loadWeekOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/schedule?action=get_week_overview')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      setWeekOverview(data.data || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load week overview'
      addError(message)
      console.error('Failed to load week overview:', error)
    } finally {
      setIsLoading(false)
    }
  }, [addError])

  const loadDaySlots = useCallback(async (date: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/schedule?action=get_day_slots&date=${date}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      setDaySlots(data.data || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load day slots'
      addError(message)
      console.error('Failed to load day slots:', error)
    } finally {
      setIsLoading(false)
    }
  }, [addError])

  const toggleWorkingDay = useCallback(async (date: string, isWorking: boolean) => {
    setTogglingDays(prev => new Set(prev).add(date))
    try {
      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_working_day',
          date,
          is_working: isWorking
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      // Update local state optimistically
      setWeekOverview(prev => prev.map(day => 
        day.day_date === date 
          ? { ...day, is_working_day: isWorking, total_slots: isWorking ? day.total_slots : 0 }
          : day
      ))

      // If current date and turning off, clear slots
      if (!isWorking && selectedDate === date) {
        setDaySlots([])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle working day'
      addError(message)
      console.error('Failed to toggle working day:', error)
    } finally {
      setTogglingDays(prev => {
        const newSet = new Set(prev)
        newSet.delete(date)
        return newSet
      })
    }
  }, [selectedDate, addError])

  const addSlot = useCallback(async (slotData: AddSlotFormData) => {
    setIsAddingSlot(true)
    try {
      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_slot',
          ...slotData
        })
      })

      const data = await response.json()
      if (data.error || !data.data?.success) {
        throw new Error(data.error || 'Failed to add slot')
      }

      // Refresh data after successful addition
      await Promise.all([
        loadWeekOverview(),
        selectedDate ? loadDaySlots(selectedDate) : Promise.resolve()
      ])

      // Reset form
      setAddSlotForm({
        slot_date: selectedDate || '',
        start_time: '',
        duration_minutes: 120,
        max_bookings: 1,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add slot'
      addError(message)
      console.error('Failed to add slot:', error)
    } finally {
      setIsAddingSlot(false)
    }
  }, [loadWeekOverview, loadDaySlots, selectedDate, addError])

  const deleteSlot = useCallback(async (slotId: string) => {
    setDeletingSlots(prev => new Set(prev).add(slotId))
    try {
      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_slot',
          slot_id: slotId
        })
      })

      const data = await response.json()
      if (data.error || !data.data?.success) {
        throw new Error(data.error || 'Failed to delete slot')
      }

      // Update local state optimistically
      setDaySlots(prev => prev.filter(slot => slot.slot_id !== slotId))
      
      // Refresh week overview to update counts
      await loadWeekOverview()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete slot'
      addError(message)
      console.error('Failed to delete slot:', error)
    } finally {
      setDeletingSlots(prev => {
        const newSet = new Set(prev)
        newSet.delete(slotId)
        return newSet
      })
    }
  }, [loadWeekOverview, addError])

  // Event handlers
  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date)
    setAddSlotForm(prev => ({ ...prev, slot_date: date }))
    await loadDaySlots(date)
  }, [loadDaySlots])

  const handleAddSlot = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addSlotForm.slot_date || !addSlotForm.start_time) return
    await addSlot(addSlotForm)
  }, [addSlot, addSlotForm])

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadWeekOverview(),
      selectedDate ? loadDaySlots(selectedDate) : Promise.resolve()
    ])
  }, [loadWeekOverview, loadDaySlots, selectedDate])

  // Memoized values
  const sortedDaySlots = useMemo(() => {
    return [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [daySlots])

  const formatTime = useCallback((time: string) => {
    try {
      const [hours, minutes] = time.split(':')
      const date = new Date()
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return time
    }
  }, [])

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  // Initial load state
  if (weekOverview.length === 0 && !isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Schedule Manager</h3>
              <p className="text-muted-foreground mb-4">
                Load your schedule to get started
              </p>
              <Button onClick={loadWeekOverview}>
                <Calendar className="h-4 w-4 mr-2" />
                Load Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule Management</h1>
          <p className="text-muted-foreground">
            Manage your working days and available time slots
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}
          
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Week Overview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekOverview.map((day) => (
              <SimpleDayCard
                key={day.day_date}
                day={day}
                isSelected={selectedDate === day.day_date}
                onSelect={handleSelectDate}
                onToggleWorkingDay={toggleWorkingDay}
                isToggling={togglingDays.has(day.day_date)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day Slots */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Slots for {formatDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedDaySlots.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No time slots configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDaySlots.map((slot) => (
                    <div
                      key={slot.slot_id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border",
                        "bg-card border-border hover:border-primary/50",
                        deletingSlots.has(slot.slot_id) && "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {slot.duration_minutes} minutes • Max {slot.max_bookings} booking(s)
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={cn(
                            "text-xs",
                            slot.is_available
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          )}>
                            {slot.is_available ? 'Available' : 'Fully booked'}
                          </Badge>
                          
                          {slot.current_bookings > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {slot.current_bookings} booked
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSlot(slot.slot_id)}
                        disabled={deletingSlots.has(slot.slot_id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        {deletingSlots.has(slot.slot_id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Slot Form */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Time Slot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSlot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slot_date">Date</Label>
                  <Input
                    id="slot_date"
                    type="date"
                    value={addSlotForm.slot_date}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, slot_date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={addSlotForm.start_time}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={addSlotForm.duration_minutes}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    min="30"
                    max="480"
                    step="30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_bookings">Max Bookings</Label>
                  <Input
                    id="max_bookings"
                    type="number"
                    value={addSlotForm.max_bookings}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, max_bookings: parseInt(e.target.value) }))}
                    min="1"
                    max="10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isAddingSlot || !addSlotForm.slot_date || !addSlotForm.start_time}
                  className="w-full"
                >
                  {isAddingSlot ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding Slot...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Slot
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}