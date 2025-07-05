'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, isBefore, startOfToday } from 'date-fns';
import { Calendar } from '@/components/ui/Calendar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/LoadingState';
import { Alert } from '@/components/ui/Alert';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { calculateVehicleSize } from '@/lib/utils/vehicle-size';
import { getAvailableTimeSlots, getAvailableDates, createBooking } from '@/lib/api/time-slots';
import { ROUTES } from '@/lib/constants/routes';
import { useBooking } from '@/lib/context/BookingContext';
import type { Database } from '@/types/supabase';
import type { DbTimeSlot } from '@/types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'] & {
  vehicle_sizes: {
    id: string;
    label: string;
    description: string | null;
    price_pence: number;
  } | null;
};

interface QuickBookProps {
  userVehicles: Vehicle[];
}

export function QuickBook({ userVehicles }: QuickBookProps) {
  const router = useRouter();
  const { dispatch } = useBooking();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<DbTimeSlot | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<DbTimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  // Set booking type to dashboard on mount
  useEffect(() => {
    dispatch({ type: 'SET_BOOKING_TYPE', payload: 'dashboard' });
    return () => {
      dispatch({ type: 'RESET' });
    };
  }, [dispatch]);

  // Load available dates on mount
  useEffect(() => {
    const loadAvailableDates = async () => {
      try {
        const dates = await getAvailableDates();
        setAvailableDates(dates);
      } catch (err) {
        console.error('Error loading available dates:', err);
        setError('Failed to load available dates');
      }
    };
    loadAvailableDates();
  }, []);

  // Fetch available time slots when date changes
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    setLoading(true);
    setError(null);

    try {
      const slots = await getAvailableTimeSlots(format(date, 'yyyy-MM-dd'));
      setAvailableTimeSlots(slots);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setError('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTimeSlot || !selectedVehicle) {
      setError('Please select a date, time slot, and vehicle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        router.push(ROUTES.SIGN_IN);
        return;
      }

      // Verify user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.push(ROUTES.SIGN_IN);
        return;
      }

      const vehicle = userVehicles.find(v => v.id === selectedVehicle);
      if (!vehicle) throw new Error('Selected vehicle not found');

      // Calculate vehicle size if not already set
      let vehicleSize = vehicle.vehicle_sizes;
      if (!vehicleSize && vehicle.make && vehicle.model) {
        const sizeResult = await calculateVehicleSize(
          vehicle.make,
          vehicle.model,
          vehicle.registration
        );
        if (!sizeResult) throw new Error('Could not determine vehicle size');
        vehicleSize = sizeResult;
      }

      if (!vehicleSize) throw new Error('Vehicle size not available');

      // Create booking
      const booking = await createBooking({
        userId: user.id,
        vehicleId: vehicle.id,
        timeSlotId: selectedTimeSlot.id,
        totalPricePence: vehicleSize.price_pence,
      });

      // Reset form
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
      setSelectedVehicle(null);

      // Redirect to booking confirmation
      router.push(`${ROUTES.DASHBOARD_BOOKINGS}/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
      console.error('Error creating booking:', err);
    } finally {
      setLoading(false);
    }
  };

  if (userVehicles.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Quick Book</h3>
          <p className="text-gray-600 mb-4">Add a vehicle to start booking</p>
          <Button onClick={() => router.push(ROUTES.DASHBOARD_VEHICLES)}>
            Add Vehicle
          </Button>
        </div>
      </Card>
    );
  }

  const isDateDisabled = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return (
      isBefore(date, startOfToday()) || 
      !availableDates.includes(formattedDate)
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Book</h3>
      
      <div className="space-y-4">
        {/* Vehicle Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Vehicle
          </label>
          <Select
            value={selectedVehicle || ''}
            onValueChange={setSelectedVehicle}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a vehicle..." />
            </SelectTrigger>
            <SelectContent>
              {userVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} ({vehicle.registration})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Only show date/time selection if a vehicle is selected */}
        {selectedVehicle && (
          <>
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                className="rounded-md border"
              />
            </div>

            {/* Time Slot Selection */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time
                </label>
                {loading ? (
                  <LoadingState text="Loading available slots..." />
                ) : availableTimeSlots.length > 0 ? (
                  <Select
                    value={selectedTimeSlot?.id || ''}
                    onValueChange={(value) => {
                      const slot = availableTimeSlots.find(s => s.id === value);
                      setSelectedTimeSlot(slot || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {format(new Date(`2000-01-01T${slot.slot_time}`), 'h:mm aa')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert variant="warning">No available slots for this date</Alert>
                )}
              </div>
            )}
          </>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            {error}
          </Alert>
        )}

        {/* Book Now Button */}
        <Button
          className="w-full mt-4"
          onClick={handleBooking}
          disabled={!selectedDate || !selectedTimeSlot || !selectedVehicle || loading}
        >
          {loading ? 'Creating Booking...' : 'Book Now'}
        </Button>
      </div>
    </Card>
  );
} 