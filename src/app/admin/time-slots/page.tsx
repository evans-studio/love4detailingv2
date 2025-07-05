'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Alert } from '@/components/ui/Alert';
import { format, addDays, startOfDay, parseISO } from 'date-fns';
import { Calendar, Clock, Plus, Settings, Trash2 } from 'lucide-react';

interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  is_booked: boolean;
  created_at: string;
}

interface WorkingHours {
  start: string;
  end: string;
  slotsCount: number;
  workingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export default function AdminTimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  
  // Working hours configuration
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    start: '10:00',
    end: '18:00',
    slotsCount: 5,
    workingDays: [1, 2, 3, 4, 5, 6] // Monday to Saturday
  });

  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    loadTimeSlots();
  }, [selectedDate]);

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/time-slots?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to load time slots');
      
      const data = await response.json();
      setTimeSlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const response = await fetch('/api/admin/time-slots/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: selectedDate,
          config: workingHours
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate time slots');
      }

      const result = await response.json();
      await loadTimeSlots();
      
      alert(`Successfully generated ${result.slotsGenerated} time slots`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate time slots');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSlotAvailability = async (slotId: string, currentlyAvailable: boolean) => {
    try {
      const response = await fetch(`/api/admin/time-slots/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          is_available: !currentlyAvailable 
        }),
      });

      if (!response.ok) throw new Error('Failed to update time slot');
      
      await loadTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time slot');
    }
  };

  const deleteTimeSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;

    try {
      const response = await fetch(`/api/admin/time-slots/${slotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete time slot');
      
      await loadTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time slot');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Slots Management</h1>
          <p className="text-gray-600 mt-2">
            Manage available booking time slots and working hours
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configure Hours
          </Button>
          
          <Button
            onClick={generateTimeSlots}
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <LoadingState className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate Slots
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Working Hours Configuration */}
      {showConfig && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Working Hours Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <Input
                type="time"
                value={workingHours.start}
                onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">End Time</label>
              <Input
                type="time"
                value={workingHours.end}
                onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Slots Per Day</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={workingHours.slotsCount}
                onChange={(e) => setWorkingHours(prev => ({ ...prev, slotsCount: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium mb-3">Working Days</label>
            <div className="flex gap-2">
              {weekDays.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const newDays = workingHours.workingDays.includes(index)
                      ? workingHours.workingDays.filter(d => d !== index)
                      : [...workingHours.workingDays, index];
                    setWorkingHours(prev => ({ ...prev, workingDays: newDays }));
                  }}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    workingHours.workingDays.includes(index)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Date Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-primary-600" />
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="text-sm text-gray-600">
            {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </Card>

      {/* Time Slots List */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">
            Time Slots for {format(parseISO(selectedDate), 'MMM d, yyyy')}
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingState>Loading time slots...</LoadingState>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No time slots found for this date</p>
            <p className="text-sm mt-2">Click "Generate Slots" to create time slots</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timeSlots.map((slot) => (
              <div
                key={slot.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  slot.is_booked
                    ? 'bg-red-50 border-red-200'
                    : slot.is_available
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="font-medium">
                    {formatTime(slot.slot_time)}
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full ${
                    slot.is_booked
                      ? 'bg-red-100 text-red-700'
                      : slot.is_available
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {slot.is_booked ? 'Booked' : slot.is_available ? 'Available' : 'Disabled'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!slot.is_booked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSlotAvailability(slot.id, slot.is_available)}
                    >
                      {slot.is_available ? 'Disable' : 'Enable'}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTimeSlot(slot.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}