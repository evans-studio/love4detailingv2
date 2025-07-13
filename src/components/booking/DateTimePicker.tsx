'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Star,
  Users,
  Zap,
  Cloud,
  Sun,
  AlertCircle,
  CheckCircle,
  Timer,
  MapPin,
  TrendingUp,
  Loader2
} from 'lucide-react'

interface TimeSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  available: boolean
  capacity: number
  maxCapacity: number
  recommended: boolean
  peakHours: boolean
  weatherDependent: boolean
  pricing: {
    basePricePence: number
    peakSurchargePence: number
    totalPricePence: number
    vehicleSize: string
  }
  estimatedTravel?: string
  qualityScore?: number
}

interface DateTimePickerProps {
  selectedDate: string | null
  selectedSlot: TimeSlot | null
  onDateSelect: (date: string) => void
  onSlotSelect: (slot: TimeSlot) => void
  minDate?: string
  maxDate?: string
  loading?: boolean
  error?: string
  showWeather?: boolean
  showPricing?: boolean
  showCapacity?: boolean
  showRecommendations?: boolean
  compactMode?: boolean
}

// Mock data for Step 1 - Static UI
const MOCK_SLOTS: TimeSlot[] = [
  {
    id: '1',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '11:00',
    available: true,
    capacity: 2,
    maxCapacity: 3,
    recommended: true,
    peakHours: false,
    weatherDependent: false,
    pricing: {
      basePricePence: 4500,
      peakSurchargePence: 0,
      totalPricePence: 4500,
      vehicleSize: 'M'
    },
    estimatedTravel: '15 min',
    qualityScore: 95
  },
  {
    id: '2',
    date: '2024-01-15',
    startTime: '11:30',
    endTime: '13:30',
    available: true,
    capacity: 1,
    maxCapacity: 3,
    recommended: false,
    peakHours: true,
    weatherDependent: false,
    pricing: {
      basePricePence: 4500,
      peakSurchargePence: 500,
      totalPricePence: 5000,
      vehicleSize: 'M'
    },
    estimatedTravel: '20 min',
    qualityScore: 88
  },
  {
    id: '3',
    date: '2024-01-15',
    startTime: '14:00',
    endTime: '16:00',
    available: true,
    capacity: 3,
    maxCapacity: 3,
    recommended: false,
    peakHours: true,
    weatherDependent: true,
    pricing: {
      basePricePence: 4500,
      peakSurchargePence: 500,
      totalPricePence: 5000,
      vehicleSize: 'M'
    },
    estimatedTravel: '25 min',
    qualityScore: 82
  },
  {
    id: '4',
    date: '2024-01-15',
    startTime: '16:30',
    endTime: '18:30',
    available: false,
    capacity: 0,
    maxCapacity: 3,
    recommended: false,
    peakHours: false,
    weatherDependent: false,
    pricing: {
      basePricePence: 4500,
      peakSurchargePence: 0,
      totalPricePence: 4500,
      vehicleSize: 'M'
    },
    estimatedTravel: '18 min',
    qualityScore: 90
  }
]

const MOCK_WEATHER = {
  '2024-01-15': { condition: 'sunny', temperature: 18, suitable: true },
  '2024-01-16': { condition: 'cloudy', temperature: 15, suitable: true },
  '2024-01-17': { condition: 'rainy', temperature: 12, suitable: false },
  '2024-01-18': { condition: 'sunny', temperature: 20, suitable: true }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function DateTimePicker({
  selectedDate,
  selectedSlot,
  onDateSelect,
  onSlotSelect,
  minDate,
  maxDate,
  loading = false,
  error,
  showWeather = true,
  showPricing = true,
  showCapacity = true,
  showRecommendations = true,
  compactMode = false
}: DateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'calendar' | 'list'>('calendar')
  const [selectedWeek, setSelectedWeek] = useState(0)
  
  const today = new Date()
  const minDateObj = minDate ? new Date(minDate) : today
  const maxDateObj = maxDate ? new Date(maxDate) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const formatPrice = (pence: number): string => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatTime = (time: string): string => {
    return time.slice(0, 5)
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun className="h-4 w-4 text-yellow-500" />
      case 'cloudy': return <Cloud className="h-4 w-4 text-gray-500" />
      case 'rainy': return <Cloud className="h-4 w-4 text-blue-500" />
      default: return <Sun className="h-4 w-4 text-gray-400" />
    }
  }

  const getAvailableDatesInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const availableDates = []

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      const dateString = currentDate.toISOString().split('T')[0]
      
      if (currentDate >= minDateObj && currentDate <= maxDateObj) {
        // Mock: Every day except Sunday has availability
        const hasAvailability = currentDate.getDay() !== 0
        availableDates.push({
          date: dateString,
          day,
          hasAvailability,
          isSelected: dateString === selectedDate,
          isToday: dateString === today.toISOString().split('T')[0]
        })
      }
    }

    return availableDates
  }

  const getSlotsForDate = (date: string): TimeSlot[] => {
    // Mock: Return slots for selected date
    return MOCK_SLOTS.map(slot => ({
      ...slot,
      date
    }))
  }

  const getUpcomingWeekDates = () => {
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() + (selectedWeek * 7))
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dateString = date.toISOString().split('T')[0]
      
      if (date >= minDateObj && date <= maxDateObj) {
        weekDates.push({
          date: dateString,
          dayName: WEEKDAYS[date.getDay()],
          dayNumber: date.getDate(),
          isSelected: dateString === selectedDate,
          isToday: dateString === today.toISOString().split('T')[0],
          hasAvailability: date.getDay() !== 0, // Mock: No Sunday availability
          weather: (MOCK_WEATHER as any)[dateString]
        })
      }
    }
    
    return weekDates
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentMonth(newMonth)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeek(prev => direction === 'next' ? prev + 1 : Math.max(0, prev - 1))
  }

  if (compactMode) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="booking-date">Date</Label>
            <Input
              id="booking-date"
              type="date"
              value={selectedDate || ''}
              onChange={(e) => onDateSelect(e.target.value)}
              min={minDateObj.toISOString().split('T')[0]}
              max={maxDateObj.toISOString().split('T')[0]}
            />
          </div>
          
          {selectedDate && (
            <div>
              <Label>Available Times</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {getSlotsForDate(selectedDate).map((slot) => (
                  <Button
                    key={slot.id}
                    variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                    onClick={() => onSlotSelect(slot)}
                    disabled={!slot.available}
                    className="text-sm"
                  >
                    {formatTime(slot.startTime)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={calendarView === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCalendarView('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={calendarView === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCalendarView('list')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Week View
          </Button>
        </div>
        
        {showRecommendations && (
          <Badge variant="secondary" className="bg-green-500/20 text-green-300">
            <Star className="h-3 w-3 mr-1" />
            Recommended slots highlighted
          </Badge>
        )}
      </div>

      {error && (
        <Alert className="border-red-500/30 bg-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-300" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* Calendar View */}
      {calendarView === 'calendar' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  disabled={currentMonth <= minDateObj}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  disabled={currentMonth >= maxDateObj}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {getAvailableDatesInMonth(currentMonth).map(({ date, day, hasAvailability, isSelected, isToday }) => (
                <Button
                  key={date}
                  variant={isSelected ? 'default' : 'ghost'}
                  className={`
                    h-10 p-0 text-sm relative
                    ${isToday ? 'ring-2 ring-primary/50' : ''}
                    ${hasAvailability ? 'hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}
                    ${isSelected ? 'bg-primary text-white' : ''}
                  `}
                  onClick={() => hasAvailability && onDateSelect(date)}
                  disabled={!hasAvailability}
                >
                  {day}
                  {hasAvailability && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-400 rounded-full"></div>
                  )}
                </Button>
              ))}
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/70">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Today
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Available
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Selected
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {calendarView === 'list' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Select Week</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  disabled={selectedWeek === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  disabled={selectedWeek >= 4}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {getUpcomingWeekDates().map(({ date, dayName, dayNumber, isSelected, isToday, hasAvailability, weather }) => (
                <Button
                  key={date}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`
                    h-20 p-2 flex flex-col items-center justify-center
                    ${isToday ? 'ring-2 ring-primary/50' : ''}
                    ${hasAvailability ? 'hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}
                    ${isSelected ? 'bg-primary text-white' : ''}
                  `}
                  onClick={() => hasAvailability && onDateSelect(date)}
                  disabled={!hasAvailability}
                >
                  <div className="text-xs font-medium">{dayName}</div>
                  <div className="text-lg font-bold">{dayNumber}</div>
                  {showWeather && weather && (
                    <div className="flex items-center gap-1 text-xs">
                      {getWeatherIcon(weather.condition)}
                      <span>{weather.temperature}°</span>
                    </div>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Slots */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Available Time Slots
            </CardTitle>
            <CardDescription>
              Select your preferred appointment time for {new Date(selectedDate).toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-white/70">Loading available slots...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {getSlotsForDate(selectedDate).map((slot) => (
                  <Card
                    key={slot.id}
                    className={`
                      cursor-pointer transition-all
                      ${slot.available ? 'hover:shadow-md' : 'opacity-50 cursor-not-allowed'}
                      ${selectedSlot?.id === slot.id ? 'ring-2 ring-primary/50 border-primary/30' : ''}
                      ${slot.recommended ? 'border-green-400/30 bg-green-500/20' : ''}
                    `}
                    onClick={() => slot.available && onSlotSelect(slot)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-primary">
                              {formatTime(slot.startTime)}
                            </div>
                            <div className="text-sm text-white/70">
                              {formatTime(slot.endTime)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {slot.recommended && (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                                <Star className="h-3 w-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                            
                            {slot.peakHours && (
                              <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Peak Hours
                              </Badge>
                            )}
                            
                            {slot.weatherDependent && (
                              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                                <Cloud className="h-3 w-3 mr-1" />
                                Weather Dependent
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          {showPricing && (
                            <div>
                              <div className="text-lg font-bold text-primary">
                                {formatPrice(slot.pricing.totalPricePence)}
                              </div>
                              {slot.pricing.peakSurchargePence > 0 && (
                                <div className="text-xs text-orange-300">
                                  +{formatPrice(slot.pricing.peakSurchargePence)} peak
                                </div>
                              )}
                            </div>
                          )}
                          
                          {showCapacity && (
                            <div className="flex items-center gap-1 text-sm text-white/70">
                              <Users className="h-3 w-3" />
                              {slot.capacity}/{slot.maxCapacity} available
                            </div>
                          )}
                          
                          {slot.estimatedTravel && (
                            <div className="flex items-center gap-1 text-xs text-white/70">
                              <MapPin className="h-3 w-3" />
                              {slot.estimatedTravel} travel
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!slot.available && (
                        <div className="mt-2 text-center text-sm text-red-300">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          Fully booked
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}