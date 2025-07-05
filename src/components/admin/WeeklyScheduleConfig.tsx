'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { WeeklyScheduleTemplate, DayOfWeek } from '@/types';
import { DAY_NAMES } from '@/types';

interface WeeklyScheduleConfigProps {
  onScheduleUpdate?: () => void;
}

export function WeeklyScheduleConfig({ onScheduleUpdate }: WeeklyScheduleConfigProps) {
  const [schedule, setSchedule] = useState<Record<DayOfWeek, WeeklyScheduleTemplate | null>>({
    0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<DayOfWeek | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduleTemplate();
  }, []);

  const loadScheduleTemplate = async () => {
    try {
      const response = await fetch('/api/admin/schedule-template');
      if (!response.ok) throw new Error('Failed to load schedule');
      
      const { data } = await response.json();
      
      const scheduleMap: Record<DayOfWeek, WeeklyScheduleTemplate | null> = {
        0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null
      };
      
      data.forEach((template: WeeklyScheduleTemplate) => {
        scheduleMap[template.day_of_week as DayOfWeek] = template;
      });
      
      setSchedule(scheduleMap);
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to load weekly schedule',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDayConfig = async (
    dayOfWeek: DayOfWeek, 
    field: string, 
    value: any
  ) => {
    setSaving(dayOfWeek);
    
    try {
      const currentConfig = schedule[dayOfWeek] || {
        day_of_week: dayOfWeek,
        working_day: false,
        max_slots: 0,
        start_time: '10:00:00',
        end_time: '18:00:00'
      };

      const updatedConfig = { ...currentConfig, [field]: value };
      
      const response = await fetch('/api/admin/schedule-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      
      if (!response.ok) throw new Error('Failed to update schedule');
      
      const { data } = await response.json();
      
      setSchedule(prev => ({
        ...prev,
        [dayOfWeek]: data
      }));
      
      toast({
        title: 'Success',
        description: `${DAY_NAMES[dayOfWeek]} schedule updated`
      });
      
      onScheduleUpdate?.();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
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
          Weekly Schedule Template
          <span className="text-sm font-normal text-muted-foreground">
            (Working Hours: 10:00 AM - 6:00 PM)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {(Object.keys(DAY_NAMES) as unknown as DayOfWeek[]).map(dayOfWeek => {
            const dayConfig = schedule[dayOfWeek];
            const isWorking = dayConfig?.working_day || false;
            const maxSlots = dayConfig?.max_slots || 0;
            const isSaving = saving === dayOfWeek;

            return (
              <div key={dayOfWeek} className="space-y-3 p-3 border rounded-lg">
                <h3 className="font-medium text-center">
                  {DAY_NAMES[dayOfWeek]}
                </h3>
                
                <div className="flex items-center justify-center space-x-2">
                  <Switch
                    checked={isWorking}
                    onCheckedChange={(checked) => 
                      updateDayConfig(dayOfWeek, 'working_day', checked)
                    }
                    disabled={isSaving}
                  />
                  <Label className="text-sm">
                    {isWorking ? 'Working' : 'Closed'}
                  </Label>
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                
                {isWorking && (
                  <div className="space-y-2">
                    <Label className="text-xs">Available Slots</Label>
                    <Select
                      value={maxSlots.toString()}
                      onValueChange={(value) => 
                        updateDayConfig(dayOfWeek, 'max_slots', parseInt(value))
                      }
                      disabled={isSaving}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} slot{num !== 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      {maxSlots > 0 && (
                        <>
                          <div>Slot 1: 10:00-11:00 AM</div>
                          {maxSlots > 1 && <div>Slot 2: 11:30-12:30 PM</div>}
                          {maxSlots > 2 && <div>Slot 3: 1:00-2:00 PM</div>}
                          {maxSlots > 3 && <div>Slot 4: 2:30-3:30 PM</div>}
                          {maxSlots > 4 && <div>Slot 5: 4:00-5:00 PM</div>}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Schedule Rules</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Maximum 5 slots per day with 30-minute travel buffers</li>
            <li>• Working hours: 10:00 AM - 6:00 PM</li>
            <li>• Each slot is 1 hour including travel time</li>
            <li>• Template applies to future weeks when generating slots</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}