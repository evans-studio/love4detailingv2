'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Save,
  AlertCircle,
  Edit,
  X,
  Check
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, parseISO } from 'date-fns';

interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  is_booked: boolean;
  created_at: string;
}

interface BulkSlotGeneration {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  selected_days: number[];
}

const bulkGenerationSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  interval_minutes: z.number().min(15, 'Minimum 15 minutes').max(240, 'Maximum 4 hours'),
  selected_days: z.array(z.number()).min(1, 'Select at least one day'),
});

type BulkGenerationFormData = z.infer<typeof bulkGenerationSchema>;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export default function AvailabilityManagement() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  const bulkForm = useForm<BulkGenerationFormData>({
    resolver: zodResolver(bulkGenerationSchema),
    defaultValues: {
      interval_minutes: 60,
      selected_days: [1, 2, 3, 4, 5], // Monday to Friday
      start_time: '09:00',
      end_time: '17:00',
    }
  });

  useEffect(() => {
    fetchTimeSlots();
  }, [currentWeek]);

  const fetchTimeSlots = async () => {
    try {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);

      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .gte('slot_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('slot_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('slot_date')
        .order('slot_time');

      if (error) throw error;

      setTimeSlots(data || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = async (data: BulkGenerationFormData) => {
    setGenerating(true);
    try {
      const slots = [];
      const startDate = parseISO(data.start_date);
      const endDate = parseISO(data.end_date);
      
      for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
        const dayOfWeek = date.getDay();
        
        if (data.selected_days.includes(dayOfWeek)) {
          const startTime = data.start_time;
          const endTime = data.end_time;
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          for (let minutes = startMinutes; minutes < endMinutes; minutes += data.interval_minutes) {
            const hour = Math.floor(minutes / 60);
            const min = minutes % 60;
            const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
            
            slots.push({
              slot_date: format(date, 'yyyy-MM-dd'),
              slot_time: timeString,
              is_available: true,
              is_booked: false,
            });
          }
        }
      }

      // Insert slots in batches
      const batchSize = 100;
      for (let i = 0; i < slots.length; i += batchSize) {
        const batch = slots.slice(i, i + batchSize);
        const { error } = await supabase
          .from('time_slots')
          .upsert(batch, {
            onConflict: 'slot_date,slot_time',
            ignoreDuplicates: true
          });
        
        if (error) throw error;
      }

      await fetchTimeSlots();
      setShowBulkForm(false);
      bulkForm.reset();
      alert(`Generated ${slots.length} time slots successfully!`);
    } catch (error) {
      console.error('Error generating time slots:', error);
      alert('Failed to generate time slots. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSlotAvailability = async (slotId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('time_slots')
        .update({ is_available: isAvailable })
        .eq('id', slotId);

      if (error) throw error;

      await fetchTimeSlots();
    } catch (error) {
      console.error('Error updating slot availability:', error);
      alert('Failed to update slot availability.');
    }
  };

  const deleteSelectedSlots = async () => {
    if (selectedSlots.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedSlots.length} time slots?`)) return;

    try {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .in('id', selectedSlots);

      if (error) throw error;

      setSelectedSlots([]);
      await fetchTimeSlots();
      alert('Selected time slots deleted successfully!');
    } catch (error) {
      console.error('Error deleting time slots:', error);
      alert('Failed to delete time slots. Please try again.');
    }
  };

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlots(prev => 
      prev.includes(slotId) 
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  const selectAllVisibleSlots = () => {
    const allSlotIds = timeSlots.map(slot => slot.id);
    setSelectedSlots(allSlotIds);
  };

  const clearSelection = () => {
    setSelectedSlots([]);
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getSlotsByDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeSlots.filter(slot => slot.slot_date === dateStr);
  };

  if (loading) {
    return <LoadingState>Loading time slots...</LoadingState>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Availability Management</h1>
        <p className="text-gray-600 mt-1">
          Manage your available time slots and generate new booking windows
        </p>
      </div>

      {/* Time Slot Management */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Time Slot Management</h2>
            <p className="text-gray-600 mt-1">View and manage available booking time slots</p>
          </div>
          <div className="flex space-x-3">
            {selectedSlots.length > 0 && (
              <Button 
                variant="outline"
                onClick={deleteSelectedSlots}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedSlots.length})
              </Button>
            )}
            <Button onClick={() => setShowBulkForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Slots
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="outline" 
            onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
          >
            ← Previous Week
          </Button>
          <h3 className="text-lg font-medium">
            {format(startOfWeek(currentWeek, { weekStartsOn: 0 }), 'MMM d')} - 
            {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 0 }), 6), 'MMM d, yyyy')}
          </h3>
          <Button 
            variant="outline" 
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            Next Week →
          </Button>
        </div>

        {/* Selection Controls */}
        {timeSlots.length > 0 && (
          <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex space-x-3">
              <Button variant="ghost" size="sm" onClick={selectAllVisibleSlots}>
                <Check className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Clear Selection
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              {selectedSlots.length} selected • {timeSlots.length} total slots
            </div>
          </div>
        )}

        {/* Weekly Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {getWeekDays().map((day, index) => {
            const daySlots = getSlotsByDay(day);
            return (
              <div key={index} className="border rounded-lg p-3">
                <div className="font-medium text-center mb-2">
                  <div className="text-sm text-gray-600">{DAYS_OF_WEEK[day.getDay()].label}</div>
                  <div className="text-lg">{format(day, 'd')}</div>
                </div>
                
                {daySlots.length === 0 ? (
                  <div className="text-center text-gray-400 text-xs py-2">
                    No slots
                  </div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {daySlots.map((slot) => (
                      <div 
                        key={slot.id}
                        className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                          selectedSlots.includes(slot.id)
                            ? 'bg-blue-100 border-blue-300'
                            : slot.is_booked
                            ? 'bg-red-100 text-red-800'
                            : slot.is_available
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                          if (!slot.is_booked) {
                            toggleSlotSelection(slot.id);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span>{slot.slot_time.slice(0, 5)}</span>
                          <div className="flex space-x-1">
                            {slot.is_booked && (
                              <span className="text-xs">📅</span>
                            )}
                            {!slot.is_booked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSlotAvailability(slot.id, !slot.is_available);
                                }}
                                className="hover:text-blue-600"
                              >
                                {slot.is_available ? '✓' : '✗'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Bulk Slot Generation Dialog */}
      <Dialog open={showBulkForm} onOpenChange={setShowBulkForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Time Slots</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={bulkForm.handleSubmit(generateTimeSlots)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  {...bulkForm.register('start_date')}
                  error={!!bulkForm.formState.errors.start_date}
                />
                {bulkForm.formState.errors.start_date && (
                  <p className="text-red-500 text-xs mt-1">{bulkForm.formState.errors.start_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  {...bulkForm.register('end_date')}
                  error={!!bulkForm.formState.errors.end_date}
                />
                {bulkForm.formState.errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{bulkForm.formState.errors.end_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <Input
                  type="time"
                  {...bulkForm.register('start_time')}
                  error={!!bulkForm.formState.errors.start_time}
                />
                {bulkForm.formState.errors.start_time && (
                  <p className="text-red-500 text-xs mt-1">{bulkForm.formState.errors.start_time.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <Input
                  type="time"
                  {...bulkForm.register('end_time')}
                  error={!!bulkForm.formState.errors.end_time}
                />
                {bulkForm.formState.errors.end_time && (
                  <p className="text-red-500 text-xs mt-1">{bulkForm.formState.errors.end_time.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interval (minutes)
              </label>
              <Input
                type="number"
                min="15"
                max="240"
                step="15"
                {...bulkForm.register('interval_minutes', { valueAsNumber: true })}
                error={!!bulkForm.formState.errors.interval_minutes}
              />
              {bulkForm.formState.errors.interval_minutes && (
                <p className="text-red-500 text-xs mt-1">{bulkForm.formState.errors.interval_minutes.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days of Week
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <label key={day.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={day.value}
                      {...bulkForm.register('selected_days')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
              {bulkForm.formState.errors.selected_days && (
                <p className="text-red-500 text-xs mt-1">{bulkForm.formState.errors.selected_days.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBulkForm(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <LoadingState className="h-4 w-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Slots
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Legend and Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Time Slot Management Guide</p>
            <div className="text-blue-700 mt-2 space-y-1">
              <p>• <span className="bg-green-100 px-2 py-1 rounded text-xs">Green</span> = Available for booking</p>
              <p>• <span className="bg-red-100 px-2 py-1 rounded text-xs">Red</span> = Already booked</p>
              <p>• <span className="bg-gray-100 px-2 py-1 rounded text-xs">Gray</span> = Unavailable</p>
              <p>• Click individual slots to select them for bulk operations</p>
              <p>• Use the ✓/✗ buttons to toggle slot availability</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}