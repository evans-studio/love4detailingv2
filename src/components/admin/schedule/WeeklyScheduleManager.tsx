'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Clock,
  Calendar,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Settings,
  Coffee
} from 'lucide-react'

interface ScheduleDay {
  day_of_week: number
  day_name: string
  is_working_day: boolean
  start_time: string | null
  end_time: string | null
  max_slots_per_hour: number
  slot_duration_minutes: number
  break_start_time: string | null
  break_end_time: string | null
  updated_at: string
}

interface ScheduleData {
  success: boolean
  schedule: ScheduleDay[]
}

interface WeeklyScheduleManagerProps {
  scheduleData: ScheduleData | null
  onScheduleUpdate: () => void
}

const DEFAULT_SCHEDULE: Omit<ScheduleDay, 'day_of_week' | 'day_name' | 'updated_at'>[] = [
  { is_working_day: true, start_time: '09:00', end_time: '17:00', max_slots_per_hour: 1, slot_duration_minutes: 120, break_start_time: '12:00', break_end_time: '13:00' }, // Monday
  { is_working_day: true, start_time: '09:00', end_time: '17:00', max_slots_per_hour: 1, slot_duration_minutes: 120, break_start_time: '12:00', break_end_time: '13:00' }, // Tuesday
  { is_working_day: true, start_time: '09:00', end_time: '17:00', max_slots_per_hour: 1, slot_duration_minutes: 120, break_start_time: '12:00', break_end_time: '13:00' }, // Wednesday
  { is_working_day: true, start_time: '09:00', end_time: '17:00', max_slots_per_hour: 1, slot_duration_minutes: 120, break_start_time: '12:00', break_end_time: '13:00' }, // Thursday
  { is_working_day: true, start_time: '09:00', end_time: '17:00', max_slots_per_hour: 1, slot_duration_minutes: 120, break_start_time: '12:00', break_end_time: '13:00' }, // Friday
  { is_working_day: false, start_time: null, end_time: null, max_slots_per_hour: 1, slot_duration_minutes: 120, break_start_time: null, break_end_time: null }, // Saturday
  { is_working_day: false, start_time: null, end_time: null, max_slots_per_hour: 1, slot_duration_minutes: 120, break_start_time: null, break_end_time: null }, // Sunday
]

export default function WeeklyScheduleManager({ scheduleData, onScheduleUpdate }: WeeklyScheduleManagerProps) {
  const { user } = useAuth()
  const [editedSchedule, setEditedSchedule] = useState<ScheduleDay[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize schedule with defaults or existing data
  useEffect(() => {
    if (scheduleData?.schedule && scheduleData.schedule.length > 0) {
      setEditedSchedule([...scheduleData.schedule])
    } else {
      // Create default schedule if none exists
      const defaultSchedule: ScheduleDay[] = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ].map((dayName, index) => ({
        day_of_week: index === 6 ? 0 : index + 1, // Sunday = 0, Monday = 1, etc.
        day_name: dayName,
        updated_at: new Date().toISOString(),
        ...DEFAULT_SCHEDULE[index]
      }))
      setEditedSchedule(defaultSchedule)
    }
    setHasChanges(false)
  }, [scheduleData])

  // Compare current schedule with original to detect changes
  useEffect(() => {
    if (scheduleData?.schedule && editedSchedule.length > 0) {
      const originalSchedule = scheduleData.schedule
      const hasChanged = editedSchedule.some((day, index) => {
        const originalDay = originalSchedule[index]
        if (!originalDay) return true
        
        return (
          day.is_working_day !== originalDay.is_working_day ||
          day.start_time !== originalDay.start_time ||
          day.end_time !== originalDay.end_time ||
          day.max_slots_per_hour !== originalDay.max_slots_per_hour ||
          day.slot_duration_minutes !== originalDay.slot_duration_minutes ||
          day.break_start_time !== originalDay.break_start_time ||
          day.break_end_time !== originalDay.break_end_time
        )
      })
      setHasChanges(hasChanged)
    }
  }, [editedSchedule, scheduleData])

  const updateDay = (dayIndex: number, updates: Partial<ScheduleDay>) => {
    setEditedSchedule(prev => prev.map((day, index) => 
      index === dayIndex ? { ...day, ...updates } : day
    ))
  }

  const toggleWorkingDay = (dayIndex: number) => {
    const day = editedSchedule[dayIndex]
    updateDay(dayIndex, {
      is_working_day: !day.is_working_day,
      start_time: !day.is_working_day ? '09:00' : null,
      end_time: !day.is_working_day ? '17:00' : null,
      break_start_time: !day.is_working_day ? '12:00' : null,
      break_end_time: !day.is_working_day ? '13:00' : null,
    })
  }

  const resetToDefaults = () => {
    const defaultSchedule: ScheduleDay[] = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ].map((dayName, index) => ({
      day_of_week: index === 6 ? 0 : index + 1,
      day_name: dayName,
      updated_at: new Date().toISOString(),
      ...DEFAULT_SCHEDULE[index]
    }))
    setEditedSchedule(defaultSchedule)
  }

  const saveSchedule = async () => {
    if (!user?.id || !hasChanges) return

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const scheduleUpdateData = {
        days: editedSchedule.map(day => ({
          day_of_week: day.day_of_week,
          is_working_day: day.is_working_day,
          start_time: day.start_time,
          end_time: day.end_time,
          max_slots_per_hour: day.max_slots_per_hour,
          slot_duration_minutes: day.slot_duration_minutes,
          break_start_time: day.break_start_time,
          break_end_time: day.break_end_time
        }))
      }

      const response = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: user.id,
          schedule_data: scheduleUpdateData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save schedule')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save schedule')
      }

      setSaveMessage({ type: 'success', text: 'Schedule saved successfully!' })
      setHasChanges(false)
      onScheduleUpdate() // Refresh parent data
      
    } catch (error) {
      console.error('Error saving schedule:', error)
      setSaveMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save schedule' 
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Clear save message after 5 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [saveMessage])

  const getWorkingHours = (day: ScheduleDay) => {
    if (!day.is_working_day || !day.start_time || !day.end_time) return 0
    
    const start = new Date(`1970-01-01T${day.start_time}`)
    const end = new Date(`1970-01-01T${day.end_time}`)
    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    
    // Subtract break time if exists
    if (day.break_start_time && day.break_end_time) {
      const breakStart = new Date(`1970-01-01T${day.break_start_time}`)
      const breakEnd = new Date(`1970-01-01T${day.break_end_time}`)
      const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60)
      return Math.max(0, totalHours - breakHours)
    }
    
    return totalHours
  }

  const getPotentialSlots = (day: ScheduleDay) => {
    const workingHours = getWorkingHours(day)
    const slotDurationHours = day.slot_duration_minutes / 60
    return Math.floor(workingHours / slotDurationHours) * day.max_slots_per_hour
  }

  return (
    <Card className="bg-gray-800/40 border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-white">Weekly Schedule Configuration</CardTitle>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                Unsaved Changes
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            
            <Button
              onClick={saveSchedule}
              disabled={isSaving || !hasChanges}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? (
                <>
                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Schedule
                </>
              )}
            </Button>
          </div>
        </div>
        
        {saveMessage && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            saveMessage.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {saveMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
            <span className={`text-sm ${
              saveMessage.type === 'success' ? 'text-green-300' : 'text-red-300'
            }`}>
              {saveMessage.text}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {editedSchedule.map((day, index) => (
          <div 
            key={day.day_name}
            className={`p-4 rounded-lg border transition-all ${
              day.is_working_day 
                ? 'bg-green-500/5 border-green-500/20' 
                : 'bg-gray-700/30 border-gray-600/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h3 className={`font-medium ${
                  day.is_working_day ? 'text-white' : 'text-white/50'
                }`}>
                  {day.day_name}
                </h3>
                <Switch
                  checked={day.is_working_day}
                  onCheckedChange={() => toggleWorkingDay(index)}
                />
                <span className="text-sm text-white/60">
                  {day.is_working_day ? 'Working Day' : 'Day Off'}
                </span>
              </div>
              
              {day.is_working_day && (
                <div className="flex items-center space-x-4 text-sm text-white/70">
                  <span>{getWorkingHours(day).toFixed(1)}h working</span>
                  <span>{getPotentialSlots(day)} potential slots</span>
                </div>
              )}
            </div>
            
            {day.is_working_day && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Working Hours */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Start Time</label>
                  <Input
                    type="time"
                    value={day.start_time || '09:00'}
                    onChange={(e) => updateDay(index, { start_time: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">End Time</label>
                  <Input
                    type="time"
                    value={day.end_time || '17:00'}
                    onChange={(e) => updateDay(index, { end_time: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                {/* Break Time */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80 flex items-center space-x-1">
                    <Coffee className="h-3 w-3" />
                    <span>Break Start</span>
                  </label>
                  <Input
                    type="time"
                    value={day.break_start_time || '12:00'}
                    onChange={(e) => updateDay(index, { break_start_time: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Break End</label>
                  <Input
                    type="time"
                    value={day.break_end_time || '13:00'}
                    onChange={(e) => updateDay(index, { break_end_time: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                {/* Slot Configuration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Slot Duration (min)</label>
                  <Input
                    type="number"
                    min="30"
                    max="480"
                    step="30"
                    value={day.slot_duration_minutes}
                    onChange={(e) => updateDay(index, { slot_duration_minutes: parseInt(e.target.value) || 120 })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Max Slots/Hour</label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={day.max_slots_per_hour}
                    onChange={(e) => updateDay(index, { max_slots_per_hour: parseInt(e.target.value) || 1 })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                {/* Summary Info */}
                <div className="md:col-span-2 p-3 bg-white/5 rounded-lg">
                  <div className="text-sm text-white/80">
                    <p className="font-medium mb-1">Day Summary:</p>
                    <p>Working: {getWorkingHours(day).toFixed(1)} hours</p>
                    <p>Potential bookings: {getPotentialSlots(day)} slots</p>
                    <p>Break duration: {
                      day.break_start_time && day.break_end_time 
                        ? ((new Date(`1970-01-01T${day.break_end_time}`).getTime() - new Date(`1970-01-01T${day.break_start_time}`).getTime()) / (1000 * 60)) + ' minutes'
                        : 'None'
                    }</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}