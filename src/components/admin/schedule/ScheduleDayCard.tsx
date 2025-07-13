'use client'

/**
 * Isolated Schedule Day Component
 * Enterprise-grade state management with proper isolation patterns
 * Each day manages its own state independently
 */

import React, { useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Loader2, AlertCircle, CheckCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScheduleStore, scheduleSelectors, type DayOverview } from '@/lib/store/schedule-enhanced'

interface ScheduleDayCardProps {
  day: DayOverview
  isSelected: boolean
  onSelect: (date: string) => void
  className?: string
}

/**
 * Isolated day card component with independent state management
 * Implements enterprise-grade patterns for reliable state synchronization
 */
export const ScheduleDayCard: React.FC<ScheduleDayCardProps> = ({
  day,
  isSelected,
  onSelect,
  className
}) => {
  // Subscribe only to this day's mutation state with stable selector
  const dayMutationState = useScheduleStore(
    scheduleSelectors.getDayMutationState(day.day_date)
  )
  
  const toggleWorkingDayEnhanced = useScheduleStore((state: any) => state.toggleWorkingDayEnhanced)

  // Memoized values for performance optimization
  const isLoading = useMemo(() => 
    dayMutationState?.isLoading || false, 
    [dayMutationState?.isLoading]
  )
  
  const hasError = useMemo(() => 
    !!dayMutationState?.error, 
    [dayMutationState?.error]
  )
  
  const errorMessage = useMemo(() => 
    dayMutationState?.error || null, 
    [dayMutationState?.error]
  )

  // Memoized day formatting for better performance
  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  // Memoized status color calculation
  const getStatusColor = useCallback((available: number, total: number) => {
    if (total === 0) return 'bg-muted text-muted-foreground border-muted'
    const ratio = available / total
    if (ratio > 0.7) return 'bg-green-50 text-green-700 border-green-200'
    if (ratio > 0.3) return 'bg-orange-50 text-orange-700 border-orange-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }, [])

  // Enhanced toggle handler with enterprise patterns
  const handleToggleWorkingDay = useCallback(async (checked: boolean) => {
    try {
      await toggleWorkingDayEnhanced(day.day_date, checked)
    } catch (error) {
      console.error('Failed to toggle working day:', error)
      // Error state is managed by the store, no additional handling needed here
    }
  }, [day.day_date, toggleWorkingDayEnhanced])

  // Handle card selection
  const handleCardClick = useCallback(() => {
    if (!isLoading) {
      onSelect(day.day_date)
    }
  }, [day.day_date, onSelect, isLoading])

  // Prevent toggle click from propagating to card
  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Memoized card styling based on state
  const cardClassName = useMemo(() => cn(
    "relative cursor-pointer transition-all duration-200 hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    {
      // Selected state
      "border-primary bg-primary/5 shadow-md scale-[1.02] ring-2 ring-primary/20": 
        isSelected,
      
      // Default state
      "border-border bg-card hover:border-primary/50": 
        !isSelected && !hasError,
      
      // Loading state
      "border-orange-300 bg-orange-50": 
        isLoading,
      
      // Error state
      "border-red-300 bg-red-50": 
        hasError,
      
      // Disabled state when loading
      "cursor-not-allowed opacity-60": 
        isLoading
    },
    className
  ), [isSelected, hasError, isLoading, className])

  return (
    <Card
      className={cardClassName}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
          e.preventDefault()
          handleCardClick()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Schedule for ${day.day_name}, ${formatDate(day.day_date)}`}
      aria-pressed={isSelected}
      aria-disabled={isLoading}
      data-testid={`schedule-day-${day.day_date}`}
    >
      <CardContent className="p-4">
        {/* Header with day name and toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {day.day_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(day.day_date)}
            </p>
          </div>
          
          <div className="flex items-center gap-2" onClick={handleToggleClick}>
            {/* Loading indicator */}
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            )}
            
            {/* Error indicator */}
            {hasError && !isLoading && (
              <AlertCircle 
                className="h-4 w-4 text-red-500" 
              />
            )}
            
            {/* Success indicator (briefly shown after successful operations) */}
            {!isLoading && !hasError && (
              <CheckCircle className="h-4 w-4 text-green-500 opacity-0 transition-opacity duration-300" />
            )}
            
            {/* Working day toggle */}
            <Switch
              checked={day.is_working_day}
              onCheckedChange={handleToggleWorkingDay}
              disabled={isLoading}
              aria-label={`Toggle working day for ${day.day_name}`}
              data-testid={`toggle-working-day-${day.day_date}`}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Status and capacity indicators */}
        <div className="space-y-2">
          {day.is_working_day ? (
            <div className="space-y-2">
              {/* Availability badge */}
              <Badge 
                className={cn(
                  "text-xs font-medium border",
                  getStatusColor(day.available_slots, day.total_slots)
                )}
                data-testid={`availability-badge-${day.day_date}`}
              >
                {day.available_slots}/{day.total_slots} available
              </Badge>
              
              {/* Booking information */}
              {day.booked_slots > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-primary/10 text-primary border-primary/20"
                >
                  {day.booked_slots} booked
                </Badge>
              )}
              
              {/* Quick stats */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Total slots:</span>
                  <span className="font-medium">{day.total_slots}</span>
                </div>
                {day.available_slots !== day.total_slots && (
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <span className="font-medium text-green-400">{day.available_slots}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge 
                variant="secondary" 
                className="text-xs text-muted-foreground bg-muted/50"
              >
                Not working
              </Badge>
              <p className="text-xs text-muted-foreground">
                Toggle on to enable this day
              </p>
            </div>
          )}
        </div>

        {/* Error message display */}
        {hasError && errorMessage && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">Error:</span>
            </div>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Display name for debugging
ScheduleDayCard.displayName = 'ScheduleDayCard'

// Memoized version for performance optimization
export const MemoizedScheduleDayCard = React.memo(ScheduleDayCard, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.day.day_date === nextProps.day.day_date &&
    prevProps.day.is_working_day === nextProps.day.is_working_day &&
    prevProps.day.total_slots === nextProps.day.total_slots &&
    prevProps.day.available_slots === nextProps.day.available_slots &&
    prevProps.day.booked_slots === nextProps.day.booked_slots &&
    prevProps.isSelected === nextProps.isSelected
  )
})

MemoizedScheduleDayCard.displayName = 'MemoizedScheduleDayCard'