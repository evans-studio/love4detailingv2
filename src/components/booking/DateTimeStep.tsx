'use client';

import { useEffect, useState, useMemo } from 'react';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { getAvailableTimeSlots } from '@/lib/api/time-slots';
import { addDays, format, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function isValidDateString(date: string | null | undefined): date is string {
  return typeof date === 'string' && date.length > 0;
}

export default function DateTimeStep() {
  const { state, dispatch } = useBooking();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{ id: string; slot_time: string }>>([]);

  // Generate next 14 days for date selection
  const availableDates = useMemo(() => {
    const dates = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      dates.push({
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEEE, MMMM d')
      });
    }
    return dates;
  }, []);

  // Load time slots when date changes
  useEffect(() => {
    const selectedDate = state.data.selectedDate;
    if (!isValidDateString(selectedDate)) return;

    let isMounted = true;

    async function loadTimeSlots(date: string) {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      try {
        const slots = await getAvailableTimeSlots(date);
        if (!isMounted) return;
        setAvailableTimeSlots(slots.map(slot => ({ id: slot.id, slot_time: slot.slot_time })));
        if (slots.length === 0) {
          setError('No time slots available for the selected date. Please try another date.');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load time slots:', error);
        setError(error instanceof Error ? error.message : 'Failed to load time slots');
        setAvailableTimeSlots([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTimeSlots(selectedDate);

    return () => {
      isMounted = false;
    };
  }, [state.data.selectedDate]);

  const handleDateSelect = (date: string) => {
    dispatch({ type: 'SET_DATE', payload: date });
    dispatch({ type: 'SET_TIME', payload: null }); // Reset time when date changes
  };

  const handleTimeSelect = (slot: { id: string; slot_time: string }) => {
    dispatch({ type: 'SET_TIME', payload: slot.slot_time });
    dispatch({ type: 'SET_TIME_SLOT_ID', payload: slot.id });
  };

  const handleNext = () => {
    if (state.data.selectedDate && state.data.selectedTime && state.data.selectedTimeSlotId) {
      const timeSlot = {
        id: state.data.selectedTimeSlotId,
        slot_date: state.data.selectedDate,
        slot_time: state.data.selectedTime,
        is_booked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      dispatch({ type: 'SET_TIME_SLOT', payload: timeSlot });
      dispatch({ type: 'SET_STEP', payload: BookingStep.Summary });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: BookingStep.VehicleSize });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>
          <p className="text-gray-600 mb-4">
            Choose your preferred booking date and time
          </p>
        </div>

        {/* Date Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select Date</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableDates.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleDateSelect(value)}
                className={`p-3 text-left rounded-lg transition-colors ${
                  state.data.selectedDate === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        {state.data.selectedDate && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Time</h3>
            {isLoading ? (
              <div className="text-center py-4">Loading available times...</div>
            ) : error ? (
              <div className="text-red-500 py-4">{error}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableTimeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleTimeSelect(slot)}
                    className={`p-3 text-center rounded-lg transition-colors ${
                      state.data.selectedTime === slot.slot_time
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {format(new Date(`2000-01-01T${slot.slot_time}`), 'h:mm a')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button onClick={handleBack} variant="outline">
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!state.data.selectedDate || !state.data.selectedTime}
          >
            Continue
          </Button>
        </div>
      </div>
    </Card>
  );
} 