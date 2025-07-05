'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
// Using alert() for notifications to match existing codebase pattern
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Users, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { AvailabilityCalendarDay, SlotGenerationResult } from '@/types';
import { SLOT_TIMES, DAY_NAMES, DayOfWeek } from '@/types';

interface AvailabilityCalendarProps {
  onSlotClick?: (date: string, slotNumber: number) => void;
  onDateGenerate?: (date: string) => void;
  refreshKey?: number;
}

export function AvailabilityCalendar({ 
  onSlotClick, 
  onDateGenerate, 
  refreshKey = 0 
}: AvailabilityCalendarProps) {
  const [weekData, setWeekData] = useState<AvailabilityCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    return monday;
  });
  // Using alert() for notifications

  useEffect(() => {
    loadWeekData();
  }, [currentWeekStart, refreshKey]);

  const loadWeekData = async () => {
    try {
      setLoading(true);
      const startDate = formatDate(currentWeekStart);
      const endDate = formatDate(getWeekEnd(currentWeekStart));
      
      const response = await fetch(
        `/api/admin/availability?start_date=${startDate}&end_date=${endDate}`
      );
      
      if (!response.ok) throw new Error('Failed to load availability data');
      
      const { data } = await response.json();
      setWeekData(data);
    } catch (error) {
      console.error('Error loading week data:', error);
      alert('Failed to load availability data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateWeekSlots = async (date: string) => {
    try {
      setGenerating(date);
      
      const response = await fetch('/api/admin/availability/generate-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: date })
      });
      
      if (!response.ok) throw new Error('Failed to generate slots');
      
      const { data }: { data: SlotGenerationResult[] } = await response.json();
      
      const totalGenerated = data.reduce((sum, result) => sum + result.generated_slots, 0);
      
      alert(`Successfully generated ${totalGenerated} slots for the week!`);
      
      await loadWeekData();
    } catch (error) {
      console.error('Error generating week slots:', error);
      alert('Failed to generate week slots. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getWeekEnd = (weekStart: Date): Date => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  };

  const getSlotStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'booked':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unavailable':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getSlotStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'booked':
        return <XCircle className="h-3 w-3" />;
      case 'unavailable':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const weekRange = `${formatDate(currentWeekStart)} - ${formatDate(getWeekEnd(currentWeekStart))}`;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateWeekSlots(formatDate(currentWeekStart))}
              disabled={generating !== null}
              className="flex items-center gap-1"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Generate Week
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
              disabled={loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Week of {weekRange}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-4">
          {weekData.map((day) => {
            const dayDate = new Date(day.date);
            const dayOfWeek = dayDate.getDay() as DayOfWeek;
            const isGenerating = generating === day.date;
            
            return (
              <div
                key={day.date}
                className={`
                  border rounded-lg p-3 space-y-2
                  ${!day.isWorkingDay ? 'bg-gray-50' : 'bg-white'}
                  ${isGenerating ? 'opacity-50' : ''}
                `}
              >
                <div className="text-center">
                  <div className="font-medium text-sm">
                    {DAY_NAMES[dayOfWeek]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dayDate.toLocaleDateString('en-GB', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
                
                {!day.isWorkingDay ? (
                  <div className="text-center py-4">
                    <div className="text-xs text-gray-500">Closed</div>
                  </div>
                ) : (
                  <>
                    <div className="text-center text-xs">
                      <Badge variant="outline" className="text-xs">
                        {day.availableSlots}/{day.maxSlots} available
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      {day.slots.map((slot) => {
                        const slotConfig = SLOT_TIMES[slot.slot_number];
                        if (!slotConfig) return null;
                        
                        return (
                          <div
                            key={slot.slot_number}
                            className={`
                              text-xs p-2 rounded border cursor-pointer
                              transition-colors duration-200
                              ${getSlotStatusColor(slot.status)}
                              hover:opacity-80
                            `}
                            onClick={() => onSlotClick?.(day.date, slot.slot_number)}
                          >
                            <div className="flex items-center gap-1">
                              {getSlotStatusIcon(slot.status)}
                              <span className="font-medium">
                                Slot {slot.slot_number}
                              </span>
                            </div>
                            <div className="text-xs opacity-75">
                              {slotConfig.time.slice(0, 5)}
                            </div>
                            {slot.booking && (
                              <div className="text-xs mt-1 font-medium">
                                {slot.booking.customer_name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {day.slots.length === 0 && (
                      <div className="text-center py-2">
                        <div className="text-xs text-gray-500 mb-2">
                          No slots generated
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDateGenerate?.(day.date)}
                          disabled={isGenerating}
                          className="text-xs h-6"
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Generate'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border bg-green-100 border-green-200"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border bg-red-100 border-red-200"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border bg-gray-100 border-gray-200"></div>
              <span>Unavailable</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Click on slots to view details or manage bookings
          </div>
        </div>
      </CardContent>
    </Card>
  );
}