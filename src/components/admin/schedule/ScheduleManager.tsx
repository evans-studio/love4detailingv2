'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/Badge'
import { Clock, Save, Copy, RotateCcw } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'

interface DaySchedule {
  day_of_week: number
  day_name: string
  is_working_day: boolean
  start_time: string
  end_time: string
  max_slots_per_hour: number
  break_times: any[]
  notes: string
}

const defaultSchedule: DaySchedule[] = [
  { day_of_week: 1, day_name: 'Monday', is_working_day: true, start_time: '08:00', end_time: '18:00', max_slots_per_hour: 2, break_times: [], notes: '' },
  { day_of_week: 2, day_name: 'Tuesday', is_working_day: true, start_time: '08:00', end_time: '18:00', max_slots_per_hour: 2, break_times: [], notes: '' },
  { day_of_week: 3, day_name: 'Wednesday', is_working_day: true, start_time: '08:00', end_time: '18:00', max_slots_per_hour: 2, break_times: [], notes: '' },
  { day_of_week: 4, day_name: 'Thursday', is_working_day: true, start_time: '08:00', end_time: '18:00', max_slots_per_hour: 2, break_times: [], notes: '' },
  { day_of_week: 5, day_name: 'Friday', is_working_day: true, start_time: '08:00', end_time: '18:00', max_slots_per_hour: 2, break_times: [], notes: '' },
  { day_of_week: 6, day_name: 'Saturday', is_working_day: true, start_time: '08:00', end_time: '16:00', max_slots_per_hour: 1, break_times: [], notes: '' },
  { day_of_week: 0, day_name: 'Sunday', is_working_day: false, start_time: '', end_time: '', max_slots_per_hour: 0, break_times: [], notes: '' }
]

export function ScheduleManager() {
  const { permissions } = useAuth()
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const response = await fetch('/api/admin/schedule')
      if (response.ok) {
        const { data } = await response.json()
        if (data && data.length > 0) {
          setSchedule(data)
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSchedule = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleData: schedule
        })
      })

      if (response.ok) {
        setMessage('Schedule updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const { error } = await response.json()
        setMessage(`Error: ${error}`)
      }
    } catch (error) {
      setMessage('Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  const updateDay = (dayOfWeek: number, updates: Partial<DaySchedule>) => {
    setSchedule(prev => prev.map(day => 
      day.day_of_week === dayOfWeek 
        ? { ...day, ...updates }
        : day
    ))
  }

  const copyToOtherDays = (sourceDay: DaySchedule) => {
    const confirmation = confirm(`Copy ${sourceDay.day_name}'s schedule to all other working days?`)
    if (confirmation) {
      setSchedule(prev => prev.map(day => 
        day.is_working_day && day.day_of_week !== sourceDay.day_of_week
          ? {
              ...day,
              start_time: sourceDay.start_time,
              end_time: sourceDay.end_time,
              max_slots_per_hour: sourceDay.max_slots_per_hour
            }
          : day
      ))
    }
  }

  const resetToDefaults = () => {
    const confirmation = confirm('Reset schedule to default working hours?')
    if (confirmation) {
      setSchedule(defaultSchedule)
    }
  }

  if (!permissions?.can_manage_schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You don't have permission to manage the schedule.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Schedule Management</h2>
          <p className="text-muted-foreground">Configure your weekly working hours and availability</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={saveSchedule}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('Error') 
            ? 'bg-destructive/10 text-destructive border border-destructive/50' 
            : 'bg-l4d-success/10 text-l4d-success border border-l4d-success/50'
        }`}>
          {message}
        </div>
      )}

      {/* Schedule Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schedule.map((day) => (
          <Card key={day.day_of_week} className="relative bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground">{day.day_name}</CardTitle>
                <div className="flex items-center gap-2">
                  {day.is_working_day && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToOtherDays(day)}
                      className="p-1 h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                                     <Switch
                     checked={day.is_working_day}
                     onCheckedChange={(checked: boolean) => 
                       updateDay(day.day_of_week, { is_working_day: checked })
                     }
                   />
                </div>
              </div>
              
              {!day.is_working_day && (
                <Badge variant="secondary" className="w-fit">
                  Closed
                </Badge>
              )}
            </CardHeader>

            {day.is_working_day && (
              <CardContent className="space-y-4">
                {/* Working Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`start-${day.day_of_week}`} className="text-foreground">Start Time</Label>
                    <Input
                      id={`start-${day.day_of_week}`}
                      type="time"
                      value={day.start_time}
                      onChange={(e) => 
                        updateDay(day.day_of_week, { start_time: e.target.value })
                      }
                      className="mt-1 bg-input border-border text-foreground"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`end-${day.day_of_week}`} className="text-foreground">End Time</Label>
                    <Input
                      id={`end-${day.day_of_week}`}
                      type="time"
                      value={day.end_time}
                      onChange={(e) => 
                        updateDay(day.day_of_week, { end_time: e.target.value })
                      }
                      className="mt-1 bg-input border-border text-foreground"
                    />
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <Label htmlFor={`capacity-${day.day_of_week}`} className="text-foreground">
                    Bookings per Hour
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => 
                        updateDay(day.day_of_week, { 
                          max_slots_per_hour: Math.max(0, day.max_slots_per_hour - 1) 
                        })
                      }
                      className="h-8 w-8 p-0 border-border text-foreground hover:bg-primary/10"
                    >
                      -
                    </Button>
                    
                    <span className="w-8 text-center font-medium text-foreground">
                      {day.max_slots_per_hour}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => 
                        updateDay(day.day_of_week, { 
                          max_slots_per_hour: Math.min(5, day.max_slots_per_hour + 1) 
                        })
                      }
                      className="h-8 w-8 p-0 border-border text-foreground hover:bg-primary/10"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Working Hours Summary */}
                {day.start_time && day.end_time && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 border border-primary/20 p-2 rounded">
                    <Clock className="h-4 w-4" />
                    <span>
                      {day.start_time} - {day.end_time} 
                      ({Math.floor((new Date(`2000-01-01 ${day.end_time}`).getTime() - new Date(`2000-01-01 ${day.start_time}`).getTime()) / (1000 * 60 * 60))} hours)
                    </span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Schedule Preview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Schedule Preview</CardTitle>
          <p className="text-sm text-muted-foreground">How customers will see your availability</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedule.filter(day => day.is_working_day).map((day) => (
              <div key={day.day_of_week} className="text-center p-3 bg-l4d-success/10 rounded-lg border border-l4d-success/20">
                <div className="font-medium text-l4d-success">{day.day_name}</div>
                <div className="text-sm text-l4d-success/80">
                  {day.start_time} - {day.end_time}
                </div>
                <div className="text-xs text-l4d-success/60 mt-1">
                  Up to {day.max_slots_per_hour} bookings/hour
                </div>
              </div>
            ))}
          </div>
          
          {schedule.filter(day => !day.is_working_day).length > 0 && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-sm text-muted-foreground">
                <strong>Closed:</strong> {schedule.filter(day => !day.is_working_day).map(day => day.day_name).join(', ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 