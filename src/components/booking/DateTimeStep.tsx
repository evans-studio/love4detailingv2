'use client';

import { useState, useEffect } from 'react';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { getAvailableTimeSlots } from '@/lib/api/time-slots';
import { TimeSlot } from '@/lib/validation/booking';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, formatTime } from '@/lib/utils';

export function DateTimeStep() {
  const { state, dispatch } = useBooking();
  const [selectedDate, setSelectedDate] = useState<string>(
    state.data.timeSlot?.slot_date || new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate next 14 days for date selection
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      value: date.toISOString().split('T')[0],
      label: formatDate(date),
    };
  }).filter(date => {
    // Filter out Sundays
    return new Date(date.value).getDay() !== 0;
  });

  useEffect(() => {
    async function loadTimeSlots() {
      try {
        setLoading(true);
        const slots = await getAvailableTimeSlots(selectedDate);
        setAvailableSlots(slots);
        setError(null);
      } catch (err) {
        console.error('Failed to load time slots:', err);
        setError('Failed to load available time slots');
      } finally {
        setLoading(false);
      }
    }

    loadTimeSlots();
  }, [selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    // Clear the selected time slot when date changes
    dispatch({
      type: 'SET_TIME_SLOT',
      payload: null,
    });
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    dispatch({
      type: 'SET_TIME_SLOT',
      payload: slot,
    });
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: BookingStep.VehicleSize });
  };

  const handleNext = () => {
    if (state.data.timeSlot) {
      dispatch({ type: 'SET_STEP', payload: BookingStep.Summary });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">Loading available time slots...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">{error}</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>
          <p className="text-gray-600 mb-4">
            Choose your preferred date and time for your vehicle detail.
            We're open Monday to Saturday, 10:00 AM to 6:00 PM.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 px-3"
            >
              {dateOptions.map((date) => (
                <option key={date.value} value={date.value}>
                  {date.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Available Time Slots</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableSlots.length === 0 ? (
                <p className="col-span-full text-center text-gray-500">
                  No time slots available for this date
                </p>
              ) : (
                availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleTimeSelect(slot)}
                    disabled={!slot.is_available}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      state.data.timeSlot?.id === slot.id
                        ? 'border-primary-500 bg-primary-50'
                        : slot.is_available
                        ? 'border-gray-200 hover:border-primary-200'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {formatTime(slot.slot_time)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!state.data.timeSlot}
          >
            Continue
          </Button>
        </div>
      </div>
    </Card>
  );
} 