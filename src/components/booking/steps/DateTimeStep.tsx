'use client';

import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Calendar } from '@/components/ui/Calendar';
import { LoadingState } from '@/components/ui/LoadingState';
import type { UnifiedBookingForm } from '@/lib/validation/booking';
import { format } from 'date-fns';

interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
}

interface DateTimeStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function DateTimeStep({ onNext, onBack }: DateTimeStepProps) {
  const { 
    register, 
    watch, 
    setValue, 
    formState: { errors },
    trigger
  } = useFormContext<UnifiedBookingForm>();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  const watchedTimeSlotId = watch('dateTime.timeSlotId');

  // Load available time slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  // Update selected slot when form value changes
  useEffect(() => {
    if (watchedTimeSlotId !== selectedSlot) {
      setSelectedSlot(watchedTimeSlotId || '');
    }
  }, [watchedTimeSlotId, selectedSlot]);

  const loadAvailableSlots = async (date: Date) => {
    setIsLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/time-slots?date=${dateStr}`);
      if (response.ok) {
        const slots: TimeSlot[] = await response.json();
        setAvailableSlots(slots.filter(slot => slot.is_available));
      }
    } catch (error) {
      console.error('Error loading time slots:', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    const selectedDate = date || null;
    setSelectedDate(selectedDate);
    setSelectedSlot('');
    setValue('dateTime.timeSlotId', '');
    setValue('dateTime.date', '');
    setValue('dateTime.time', '');
    
    if (selectedDate) {
      setValue('dateTime.date', format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot.id);
    setValue('dateTime.timeSlotId', slot.id);
    setValue('dateTime.date', slot.slot_date);
    setValue('dateTime.time', slot.slot_time);
  };

  const handleNext = async () => {
    const isValid = await trigger(['dateTime.timeSlotId', 'dateTime.date', 'dateTime.time']);
    if (isValid) {
      onNext();
    }
  };

  const formatTimeSlot = (time: string) => {
    // Convert 24-hour time to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-[#F2F2F2]">Select Date & Time</h2>
        <p className="text-[#C7C7C7] mb-6">
          Choose your preferred date and time for the service
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar */}
        <div>
          <label className="block text-sm font-medium text-[#C7C7C7] mb-3">
            Select Date <span className="text-[#BA0C2F]">*</span>
          </label>
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateChange}
            disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
            className="border rounded-lg p-3"
          />
          {errors.dateTime?.date && (
            <p className="mt-2 text-sm text-[#BA0C2F]">{errors.dateTime.date.message}</p>
          )}
        </div>

        {/* Time Slots */}
        <div>
          <label className="block text-sm font-medium text-[#C7C7C7] mb-3">
            Available Time Slots <span className="text-[#BA0C2F]">*</span>
          </label>
          
          {!selectedDate ? (
            <div className="text-center py-8 text-gray-500">
              <p>Please select a date first</p>
            </div>
          ) : isLoadingSlots ? (
            <div className="flex justify-center py-8">
              <LoadingState>Loading available slots...</LoadingState>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No available slots for this date</p>
              <p className="text-sm mt-2">Please select a different date</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSlotSelect(slot)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedSlot === slot.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">
                    {formatTimeSlot(slot.slot_time)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(slot.slot_date), 'EEEE, MMM d')}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {errors.dateTime?.timeSlotId && (
            <p className="mt-2 text-sm text-[#BA0C2F]">{errors.dateTime.timeSlotId.message}</p>
          )}
        </div>
      </div>

      {/* Selected Summary */}
      {selectedDate && selectedSlot && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-green-900 mb-2">Selected Appointment</h3>
          <p className="text-green-800">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')} at{' '}
            {availableSlots.find(s => s.id === selectedSlot)?.slot_time && 
              formatTimeSlot(availableSlots.find(s => s.id === selectedSlot)!.slot_time)}
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Next: Review & Confirm
        </button>
      </div>
    </div>
  );
}