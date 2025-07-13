'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertTriangle, XCircle, Star, Loader2 } from 'lucide-react'

export interface TimeSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  duration: number
  availableCapacity: number
  totalCapacity: number
  status: 'available' | 'booked' | 'last_available' | 'unavailable'
  category: 'standard' | 'popular' | 'regular'
  label?: string
  isStandard: boolean
  displayOrder: number
  templateName?: string
  pricing?: {
    base_price_pence: number
    duration_minutes: number
    vehicle_size: string
  }
}

export interface TimeSlotPickerProps {
  selectedDate?: string
  slots: TimeSlot[]
  selectedSlot?: TimeSlot | null
  onSlotSelect: (slot: TimeSlot) => void
  onSlotDeselect: () => void
  loading?: boolean
  error?: string
  showCapacity?: boolean
  showPricing?: boolean
  accessibilityMode?: boolean
  className?: string
}

const StatusIcon = ({ status, category }: { status: TimeSlot['status']; category: TimeSlot['category'] }) => {
  const iconClass = "h-5 w-5"
  
  if (category === 'popular') {
    return <Star className={cn(iconClass, "text-orange-500")} />
  }
  
  switch (status) {
    case 'available':
      return <CheckCircle className={cn(iconClass, "text-green-500")} />
    case 'booked':
      return <XCircle className={cn(iconClass, "text-purple-500")} />
    case 'last_available':
      return <AlertTriangle className={cn(iconClass, "text-orange-500")} />
    case 'unavailable':
    default:
      return <XCircle className={cn(iconClass, "text-gray-500")} />
  }
}

const getStatusLabel = (status: TimeSlot['status'], category: TimeSlot['category']) => {
  if (category === 'popular') return 'Popular Time'
  
  switch (status) {
    case 'available':
      return 'Available'
    case 'booked':
      return 'Fully Booked'
    case 'last_available':
      return 'Last Available'
    case 'unavailable':
    default:
      return 'Unavailable'
  }
}

const formatTime = (timeString: string) => {
  try {
    const [hours, minutes] = timeString.split(':')
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
    return timeString
  }
}

const formatPrice = (pricePence: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(pricePence / 100)
}

const TimeSlotCard = React.forwardRef<
  HTMLDivElement,
  {
    slot: TimeSlot
    isSelected: boolean
    onSelect: () => void
    showCapacity: boolean
    showPricing: boolean
    accessibilityMode: boolean
  }
>(({ slot, isSelected, onSelect, showCapacity, showPricing, accessibilityMode }, ref) => {
  const isInteractive = slot.status === 'available' || slot.status === 'last_available'
  
  const cardVariant = React.useMemo(() => {
    if (!isInteractive) return 'disabled'
    if (isSelected) return 'selected'
    if (slot.status === 'last_available') return 'warning'
    return 'default'
  }, [isInteractive, isSelected, slot.status])

  const ariaLabel = React.useMemo(() => {
    const timeRange = `${formatTime(slot.startTime)} to ${formatTime(slot.endTime)}`
    const statusText = getStatusLabel(slot.status, slot.category)
    const capacityText = showCapacity && slot.availableCapacity > 0 
      ? `, ${slot.availableCapacity} of ${slot.totalCapacity} spots available`
      : ''
    const priceText = showPricing && slot.pricing 
      ? `, costs ${formatPrice(slot.pricing.base_price_pence)}`
      : ''
    
    return `Time slot ${timeRange}, ${statusText}${capacityText}${priceText}`
  }, [slot, showCapacity, showPricing])

  return (
    <Card
      ref={ref}
      className={cn(
        "relative cursor-pointer transition-all duration-200 min-h-[120px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
        {
          // Available state - using design system colors
          "border-green-500 bg-card text-card-foreground hover:shadow-lg hover:scale-[1.02]": 
            cardVariant === 'default',
          
          // Selected state - using brand purple
          "border-purple-500 bg-purple-50 text-card-foreground shadow-lg scale-[1.02] ring-2 ring-purple-500/20": 
            cardVariant === 'selected',
          
          // Warning/Last available state
          "border-orange-500 bg-card text-card-foreground hover:shadow-lg hover:scale-[1.02]": 
            cardVariant === 'warning',
          
          // Disabled state
          "border-border bg-muted/30 text-muted-foreground cursor-not-allowed": 
            cardVariant === 'disabled',
          
          // Accessibility mode enhancements
          "border-2": accessibilityMode,
          "min-h-[140px]": accessibilityMode
        }
      )}
      onClick={isInteractive ? onSelect : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect()
        }
      }}
      tabIndex={isInteractive ? 0 : -1}
      role="button"
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      aria-disabled={!isInteractive}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header with time and status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <h3 className={cn(
              "font-semibold text-lg leading-tight",
              accessibilityMode && "text-xl"
            )}>
              {slot.label || formatTime(slot.startTime)}
            </h3>
            <p className={cn(
              "text-sm text-muted-foreground",
              accessibilityMode && "text-base"
            )}>
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusIcon status={slot.status} category={slot.category} />
            {slot.category === 'standard' && (
              <Badge variant="outline" className="text-xs">
                Standard
              </Badge>
            )}
            {slot.category === 'popular' && (
              <Badge variant="default" className="text-xs bg-orange-500/20 text-orange-300">
                Popular
              </Badge>
            )}
          </div>
        </div>

        {/* Status and capacity info */}
        <div className="flex-1 flex flex-col justify-center">
          <div className={cn(
            "text-sm font-medium",
            {
              "text-green-400": slot.status === 'available',
              "text-purple-400": slot.status === 'booked',
              "text-orange-400": slot.status === 'last_available',
              "text-gray-500": slot.status === 'unavailable'
            }
          )}>
            {getStatusLabel(slot.status, slot.category)}
          </div>
          
          {showCapacity && slot.status !== 'unavailable' && (
            <div className="text-xs text-muted-foreground mt-1">
              {slot.availableCapacity > 0 ? (
                <>
                  {slot.availableCapacity} of {slot.totalCapacity} available
                </>
              ) : (
                'No capacity remaining'
              )}
            </div>
          )}
          
          {showPricing && slot.pricing && (
            <div className="text-sm font-medium text-foreground mt-1">
              {formatPrice(slot.pricing.base_price_pence)}
            </div>
          )}
        </div>

        {/* Action button for interactive slots */}
        {isInteractive && (
          <div className="mt-3">
            <Button
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={cn(
                "w-full transition-all",
                accessibilityMode && "h-12 text-base"
              )}
              tabIndex={-1} // Parent card handles focus
            >
              {isSelected ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Selected
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Select Time
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
})

TimeSlotCard.displayName = 'TimeSlotCard'

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDate,
  slots,
  selectedSlot,
  onSlotSelect,
  onSlotDeselect,
  loading = false,
  error,
  showCapacity = false,
  showPricing = false,
  accessibilityMode = false,
  className
}) => {
  // Sort slots by display order and time
  const sortedSlots = React.useMemo(() => {
    return [...slots].sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder
      }
      return a.startTime.localeCompare(b.startTime)
    })
  }, [slots])

  // Group by standard vs non-standard slots
  const { standardSlots, customSlots } = React.useMemo(() => {
    const standard = sortedSlots.filter(slot => slot.isStandard)
    const custom = sortedSlots.filter(slot => !slot.isStandard)
    return { standardSlots: standard, customSlots: custom }
  }, [sortedSlots])

  const handleSlotSelect = React.useCallback((slot: TimeSlot) => {
    if (selectedSlot?.id === slot.id) {
      onSlotDeselect()
    } else {
      onSlotSelect(slot)
    }
  }, [selectedSlot, onSlotSelect, onSlotDeselect])

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
          <p className="text-muted-foreground">Loading available times...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Times</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Times Available</h3>
          <p className="text-muted-foreground">
            {selectedDate 
              ? `No appointment slots are available for ${new Date(selectedDate).toLocaleDateString()}.`
              : 'No appointment slots are available for the selected date.'
            }
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please try selecting a different date.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)} role="region" aria-label="Available appointment times">
      {/* Color Legend */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Time Slot Indicators</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-orange-600">Last Available</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-orange-500" />
            <span className="text-orange-600">Popular Time</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-gray-500" />
            <span className="text-gray-500">Unavailable</span>
          </div>
        </div>
      </div>

      {/* Standard slots section */}
      {standardSlots.length > 0 && (
        <div>
          <h3 className={cn(
            "text-lg font-semibold text-foreground mb-4",
            accessibilityMode && "text-xl"
          )}>
            Standard Times
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {standardSlots.map((slot) => (
              <TimeSlotCard
                key={slot.id}
                slot={slot}
                isSelected={selectedSlot?.id === slot.id}
                onSelect={() => handleSlotSelect(slot)}
                showCapacity={showCapacity}
                showPricing={showPricing}
                accessibilityMode={accessibilityMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom slots section */}
      {customSlots.length > 0 && (
        <div>
          <h3 className={cn(
            "text-lg font-semibold text-foreground mb-4",
            accessibilityMode && "text-xl"
          )}>
            {standardSlots.length > 0 ? 'Additional Times' : 'Available Times'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customSlots.map((slot) => (
              <TimeSlotCard
                key={slot.id}
                slot={slot}
                isSelected={selectedSlot?.id === slot.id}
                onSelect={() => handleSlotSelect(slot)}
                showCapacity={showCapacity}
                showPricing={showPricing}
                accessibilityMode={accessibilityMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary info */}
      {selectedSlot && (
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-semibold text-purple-900 mb-2">Selected Time</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-700">
              {selectedSlot.label || formatTime(selectedSlot.startTime)} on{' '}
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'selected date'}
            </span>
            {showPricing && selectedSlot.pricing && (
              <span className="font-medium text-purple-900">
                {formatPrice(selectedSlot.pricing.base_price_pence)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Legacy component compatibility wrapper
export interface LegacySlotPickerProps {
  serviceId: string
  vehicleSize: 'small' | 'medium' | 'large' | 'extra_large'
  onSlotSelect: (slot: any) => void
  selectedSlotId?: string
}

export function SlotPicker(props: LegacySlotPickerProps) {
  const [slots, setSlots] = React.useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchSlots = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const params = new URLSearchParams({
        date_start: today,
        date_end: weekLater,
        service_id: props.serviceId,
        vehicle_size: props.vehicleSize
      })

      const response = await fetch(`/api/bookings/available-slots?${params}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        setSlots([])
      } else {
        // Transform the data to match the new interface
        const transformedSlots: TimeSlot[] = (data.data || []).map((slot: any) => ({
          id: slot.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration || 120,
          availableCapacity: slot.availableCapacity || 1,
          totalCapacity: slot.totalCapacity || 1,
          status: slot.status,
          category: slot.category || (slot.isStandard ? 'standard' : 'regular'),
          label: slot.label,
          isStandard: slot.isStandard || false,
          displayOrder: slot.displayOrder || 0,
          templateName: slot.templateName,
          pricing: slot.pricing
        }))
        
        setSlots(transformedSlots)
      }
    } catch (err) {
      setError('Failed to load available time slots')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [props.serviceId, props.vehicleSize])

  React.useEffect(() => {
    fetchSlots()
  }, [props.serviceId, props.vehicleSize])

  const handleSlotSelect = React.useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot)
    // Transform back to legacy format
    const legacySlot = {
      slot_id: slot.id,
      slot_date: slot.date,
      start_time: slot.startTime,
      end_time: slot.endTime,
      available_capacity: slot.availableCapacity,
      max_capacity: slot.totalCapacity,
      service_duration: slot.duration,
      pricing_info: slot.pricing || {
        base_price_pence: 0,
        duration_minutes: slot.duration,
        vehicle_size: props.vehicleSize,
        total_price_pence: 0
      }
    }
    props.onSlotSelect(legacySlot)
  }, [props.onSlotSelect, props.vehicleSize])

  const handleSlotDeselect = React.useCallback(() => {
    setSelectedSlot(null)
  }, [])

  return (
    <TimeSlotPicker
      slots={slots}
      selectedSlot={selectedSlot}
      onSlotSelect={handleSlotSelect}
      onSlotDeselect={handleSlotDeselect}
      loading={loading}
      error={error || undefined}
      showCapacity={true}
      showPricing={true}
      className="w-full"
    />
  )
}