'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, Clock, Calendar, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { DayOfWeek } from '@/types';

interface WeeklyScheduleTemplate {
  day_of_week: DayOfWeek;
  working_day: boolean;
  max_slots: number;
  slot_1_time?: string;
  slot_2_time?: string;
  slot_3_time?: string;
  slot_4_time?: string;
  slot_5_time?: string;
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday', 
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

const DEFAULT_TIMES = [
  '08:00', '10:00', '12:00', '14:00', '16:00'
];

export default function WeeklyScheduleConfig() {
  const [schedule, setSchedule] = useState<Record<DayOfWeek, WeeklyScheduleTemplate>>({} as any);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<DayOfWeek | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/weekly-schedule');
      
      if (!response.ok) {
        throw new Error('Failed to load schedule');
      }
      
      const data = await response.json();
      const scheduleMap: Record<DayOfWeek, WeeklyScheduleTemplate> = {} as any;
      
      // Initialize all days with defaults
      for (let i = 0; i <= 6; i++) {
        const dayOfWeek = i as DayOfWeek;
        const existingDay = data.find((d: any) => d.day_of_week === dayOfWeek);
        
        scheduleMap[dayOfWeek] = existingDay || {
          day_of_week: dayOfWeek,
          working_day: dayOfWeek >= 1 && dayOfWeek <= 5, // Monday-Friday default
          max_slots: dayOfWeek >= 1 && dayOfWeek <= 5 ? 5 : 0,
          slot_1_time: DEFAULT_TIMES[0],
          slot_2_time: DEFAULT_TIMES[1],
          slot_3_time: DEFAULT_TIMES[2],
          slot_4_time: DEFAULT_TIMES[3],
          slot_5_time: DEFAULT_TIMES[4],
        };
      }
      
      setSchedule(scheduleMap);
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Failed to load schedule. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const validateTime = (time: string): boolean => {
    if (!time) return false;
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 480 && totalMinutes <= 1200; // 8AM-8PM
  };

  const formatTimeDisplay = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const updateDayConfig = async (
    dayOfWeek: DayOfWeek, 
    field: keyof WeeklyScheduleTemplate, 
    value: any
  ) => {
    try {
      setSaving(dayOfWeek);
      setErrors({});
      
      // Validate time fields
      if (field.toString().includes('time') && value) {
        if (!validateTime(value)) {
          setErrors({
            [`${dayOfWeek}_${field}`]: 'Time must be between 8:00 AM and 8:00 PM'
          });
          return;
        }
      }
      
      const updatedConfig = {
        ...schedule[dayOfWeek],
        [field]: value
      };
      
      // If turning off working day, set max_slots to 0
      if (field === 'working_day' && !value) {
        updatedConfig.max_slots = 0;
      }
      
      const response = await fetch('/api/admin/weekly-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: dayOfWeek,
          ...updatedConfig
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      
      const updatedData = await response.json();
      
      setSchedule(prev => ({
        ...prev,
        [dayOfWeek]: updatedData
      }));
      
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const getSlotTimeValue = (dayConfig: WeeklyScheduleTemplate, slotIndex: number): string => {
    const timeFields = ['slot_1_time', 'slot_2_time', 'slot_3_time', 'slot_4_time', 'slot_5_time'];
    const fieldName = timeFields[slotIndex] as keyof WeeklyScheduleTemplate;
    return (dayConfig[fieldName] as string) || DEFAULT_TIMES[slotIndex];
  };

  const updateSlotTime = (dayOfWeek: DayOfWeek, slotIndex: number, time: string) => {
    const timeFields = ['slot_1_time', 'slot_2_time', 'slot_3_time', 'slot_4_time', 'slot_5_time'];
    const fieldName = timeFields[slotIndex] as keyof WeeklyScheduleTemplate;
    updateDayConfig(dayOfWeek, fieldName, time);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Ultra-Flexible Schedule Template
          <span className="text-sm font-normal text-muted-foreground">
            (8:00 AM - 8:00 PM • 15-min precision)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(errors).length > 0 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the validation errors before continuing.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {(Object.keys(DAY_NAMES) as unknown as DayOfWeek[]).map(dayOfWeek => {
            const dayConfig = schedule[dayOfWeek];
            const isWorking = dayConfig?.working_day || false;
            const maxSlots = dayConfig?.max_slots || 0;
            const isSaving = saving === dayOfWeek;

            return (
              <div key={dayOfWeek} className="space-y-3 p-4 border rounded-lg bg-gradient-to-br from-white to-slate-50">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">
                    {DAY_NAMES[dayOfWeek]}
                  </h3>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <Switch
                      checked={isWorking}
                      onCheckedChange={(checked) => 
                        updateDayConfig(dayOfWeek, 'working_day', checked)
                      }
                      disabled={isSaving}
                    />
                    <Label className="text-sm font-medium">
                      {isWorking ? (
                        <span className="text-green-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Working
                        </span>
                      ) : (
                        <span className="text-gray-500">Closed</span>
                      )}
                    </Label>
                    {isSaving && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                  </div>
                </div>
                
                {isWorking && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Available Slots</Label>
                      <Select
                        value={maxSlots.toString()}
                        onValueChange={(value) => 
                          updateDayConfig(dayOfWeek, 'max_slots', parseInt(value))
                        }
                        disabled={isSaving}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} slot{num !== 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Time Slot Inputs */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Precision Times (15-min steps)
                      </Label>
                      
                      {Array.from({ length: maxSlots }, (_, index) => {
                        const currentTime = getSlotTimeValue(dayConfig, index);
                        const errorKey = `${dayOfWeek}_slot_${index + 1}_time`;
                        const hasError = !!errors[errorKey];
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-12">
                                Slot {index + 1}:
                              </span>
                              <Input
                                type="time"
                                step="900" // 15 minutes in seconds
                                min="08:00"
                                max="20:00"
                                value={currentTime}
                                onChange={(e) => updateSlotTime(dayOfWeek, index, e.target.value)}
                                disabled={isSaving}
                                className={`h-7 text-xs ${hasError ? 'border-red-300' : ''}`}
                              />
                              <span className="text-xs text-purple-600 font-medium">
                                +1hr
                              </span>
                            </div>
                            
                            {/* Visual Time Display */}
                            <div className="text-xs text-center p-1 bg-blue-50 rounded border border-blue-200">
                              📅 {formatTimeDisplay(currentTime)} - {
                                formatTimeDisplay(
                                  (() => {
                                    if (!currentTime) return '';
                                    const [hours, minutes] = currentTime.split(':').map(Number);
                                    const endHour = hours + 1;
                                    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                  })()
                                )
                              }
                            </div>
                            
                            {hasError && (
                              <div className="text-xs text-red-600">
                                {errors[errorKey]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Enhanced Information Panel */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Ultra-Flexible Features
            </h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• 15-minute precision (8:15, 8:30, 8:45, 9:00...)</li>
              <li>• 288 possible time slots per day</li>
              <li>• Perfect lifestyle adaptation</li>
              <li>• Different schedule each day possible</li>
            </ul>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Schedule Rules
            </h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Working hours: 8:00 AM - 8:00 PM</li>
              <li>• Maximum 5 slots per day</li>
              <li>• Each appointment is 1 hour</li>
              <li>• Template applies to future bookings</li>
            </ul>
          </div>
        </div>
        
        {/* Example Schedule Display */}
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-900 mb-2">
            ✨ Example: Your clients can now set times like:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-amber-800">
            <div>🌅 Early Bird: 8:15 AM</div>
            <div>🌄 Mid-Morning: 10:45 AM</div>
            <div>🌞 Lunch Special: 1:30 PM</div>
            <div>🌅 Afternoon: 3:15 PM</div>
            <div>🌆 Evening: 6:45 PM</div>
            <div>🌃 Late Service: 7:30 PM</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}