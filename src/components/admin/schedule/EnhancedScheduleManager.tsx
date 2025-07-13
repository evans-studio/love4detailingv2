'use client'

/**
 * Enhanced Schedule Manager
 * Enterprise-grade implementation with proper state synchronization patterns
 * Implements all requirements from the state management guide
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Plus, Trash2, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useScheduleStore, scheduleSelectors } from '@/lib/store/schedule-enhanced'
import { MemoizedScheduleDayCard } from './ScheduleDayCard'
import { ScheduleErrorBoundary } from '@/components/ErrorBoundary'

interface AddSlotFormData {
  slot_date: string
  start_time: string
  duration_minutes: number
  max_bookings: number
}

function EnhancedScheduleManagerContent() {
  // SIMPLIFIED: Remove all cascading effects that cause infinite loops
  const weekOverview = useScheduleStore(scheduleSelectors.weekOverview)
  const daySlots = useScheduleStore(scheduleSelectors.daySlots)
  const selectedDate = useScheduleStore(scheduleSelectors.selectedDate)
  const mutations = useScheduleStore(scheduleSelectors.mutations)
  const isGlobalLoading = useScheduleStore(scheduleSelectors.isLoading)
  const globalErrors = useScheduleStore(scheduleSelectors.errors)
  
  // Store actions with stable references
  const { 
    loadWeekOverview, 
    loadDaySlots, 
    setSelectedDate, 
    addSlotEnhanced, 
    deleteSlotEnhanced, 
    refreshData 
  } = useScheduleStore((state: any) => ({
    loadWeekOverview: state.loadWeekOverview,
    loadDaySlots: state.loadDaySlots,
    setSelectedDate: state.setSelectedDate,
    addSlotEnhanced: state.addSlotEnhanced,
    deleteSlotEnhanced: state.deleteSlotEnhanced,
    refreshData: state.refreshData
  }))

  // Local component state
  const [addSlotForm, setAddSlotForm] = useState<AddSlotFormData>({
    slot_date: '',
    start_time: '',
    duration_minutes: 120,
    max_bookings: 1,
  })

  // Memoized derived state with stable dependencies
  const hasAnyErrors = useMemo(() => {
    return globalErrors && globalErrors.length > 0
  }, [globalErrors?.length])
  
  const isAddingSlot = useMemo(() => {
    const mutationValues = Object.values(mutations || {})
    return mutationValues.some((m: any) => m?.operation === 'addSlot' && m?.isLoading)
  }, [mutations])

  // SIMPLIFIED: Manual initialization only - no auto effects
  const [hasInitialized, setHasInitialized] = useState(false)
  
  const handleManualInit = useCallback(async () => {
    if (!hasInitialized) {
      try {
        setHasInitialized(true)
        await loadWeekOverview()
      } catch (error) {
        console.error('Failed to initialize schedule data:', error)
        setHasInitialized(false)
      }
    }
  }, [hasInitialized, loadWeekOverview])

  // SIMPLIFIED: Manual day loading only - no auto effects
  const handleSelectDate = useCallback(async (date: string) => {
    try {
      setSelectedDate(date)
      await loadDaySlots(date)
      setAddSlotForm(prev => ({ ...prev, slot_date: date }))
    } catch (error) {
      console.error('Failed to load day slots:', error)
    }
  }, [setSelectedDate, loadDaySlots])

  // Enhanced slot addition with proper error handling
  const handleAddSlot = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!addSlotForm.slot_date || !addSlotForm.start_time) {
      return
    }

    try {
      await addSlotEnhanced(addSlotForm)
      
      // Reset form on success
      setAddSlotForm({
        slot_date: selectedDate || '',
        start_time: '',
        duration_minutes: 120,
        max_bookings: 1,
      })
    } catch (error) {
      console.error('Failed to add slot:', error)
      // Error state is managed by the store
    }
  }, [addSlotForm, addSlotEnhanced, selectedDate])

  // Enhanced slot deletion
  const handleDeleteSlot = useCallback(async (slotId: string) => {
    try {
      await deleteSlotEnhanced(slotId)
    } catch (error) {
      console.error('Failed to delete slot:', error)
      // Error state is managed by the store
    }
  }, [deleteSlotEnhanced])

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await refreshData()
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }, [refreshData])

  // Enhanced time formatting
  const formatTime = useCallback((time: string) => {
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours, 10)
      const minute = parseInt(minutes, 10)
      
      const date = new Date()
      date.setHours(hour, minute, 0, 0)
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return time
    }
  }, [])

  // Enhanced date formatting
  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  // Memoized sorted day slots with stable keys
  const sortedDaySlots = useMemo(() => {
    return [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [daySlots])


  // SIMPLIFIED: Show manual init button if not initialized
  if (!hasInitialized) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Schedule Manager</h3>
              <p className="text-muted-foreground mb-4">
                Click below to load your schedule data
              </p>
              <Button onClick={handleManualInit} disabled={isGlobalLoading}>
                {isGlobalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Load Schedule
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule Management</h1>
          <p className="text-muted-foreground">
            Manage your working days and available time slots with enterprise-grade reliability
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Global loading indicator */}
          {isGlobalLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing...
            </div>
          )}
          
          {/* Refresh button */}
          <Button
            onClick={handleRefresh}
            disabled={isGlobalLoading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isGlobalLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Error Alert */}
      {hasAnyErrors && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">There were issues with some operations:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {globalErrors.map((error: any, index: number) => (
                  <li key={`error-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Week Overview with Isolated Day Components */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekOverview.map((day: any) => (
              <MemoizedScheduleDayCard
                key={`day-${day.day_date}`} // Stable, unique key
                day={day}
                isSelected={selectedDate === day.day_date}
                onSelect={handleSelectDate}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Day Slots Display */}
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
                  <p className="text-muted-foreground text-lg">No time slots configured</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add slots using the form on the right
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDaySlots.map((slot) => {
                    const isDeleting = mutations[`delete_slot_${slot.slot_id}`]?.isLoading
                    
                    return (
                      <div
                        key={`slot-${slot.slot_id}`} // Stable, unique key
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border transition-all",
                          "bg-card border-border hover:border-primary/50",
                          isDeleting && "opacity-50 pointer-events-none"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            {slot.duration_minutes} minutes • Max {slot.max_bookings} booking(s)
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge
                              className={cn(
                                "text-xs",
                                slot.is_available
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              )}
                            >
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
                          onClick={() => handleDeleteSlot(slot.slot_id)}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Add Slot Form */}
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
                  <Label htmlFor="slot_date" className="text-foreground">Date</Label>
                  <Input
                    id="slot_date"
                    type="date"
                    value={addSlotForm.slot_date}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, slot_date: e.target.value }))}
                    required
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_time" className="text-foreground">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={addSlotForm.start_time}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes" className="text-foreground">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={addSlotForm.duration_minutes}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    min="30"
                    max="480"
                    step="30"
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_bookings" className="text-foreground">Max Bookings</Label>
                  <Input
                    id="max_bookings"
                    type="number"
                    value={addSlotForm.max_bookings}
                    onChange={(e) => setAddSlotForm(prev => ({ ...prev, max_bookings: parseInt(e.target.value) }))}
                    min="1"
                    max="10"
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isAddingSlot || !addSlotForm.slot_date || !addSlotForm.start_time}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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

export default function EnhancedScheduleManager() {
  return (
    <ScheduleErrorBoundary>
      <EnhancedScheduleManagerContent />
    </ScheduleErrorBoundary>
  )
}