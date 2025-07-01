import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { bookingSchema } from '@/lib/validation/booking';
import { createBooking } from '@/lib/api/booking';
import { services } from '@/data/services';
import { useRouter } from 'next/navigation';

export function ReviewStep() {
  const { state, dispatch } = useBooking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedService = services.find(s => s.id === state.data.serviceId);

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: BookingStep.User });
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.data),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const booking = await response.json();
      dispatch({ type: 'COMPLETE_BOOKING' });
      router.push(`/confirmation?id=${booking.id}`);
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating your booking');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (step: BookingStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  if (!selectedService || !state.data.date) {
    return null;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Details */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">Service</h3>
                <p className="text-sm text-gray-600">{selectedService.name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(BookingStep.Service)}
              >
                Edit
              </Button>
            </div>
            <div>
              <p className="font-medium">Price</p>
              <p className="text-sm text-gray-600">£{selectedService.price}</p>
            </div>
            <div>
              <p className="font-medium">Duration</p>
              <p className="text-sm text-gray-600">{selectedService.duration}</p>
            </div>
          </div>
        </Card>

        {/* Vehicle Details */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">Vehicle</h3>
                <p className="text-sm text-gray-600">{state.data.registration}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(BookingStep.Vehicle)}
              >
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Make</p>
                <p className="text-sm text-gray-600">{state.data.make}</p>
              </div>
              <div>
                <p className="font-medium">Model</p>
                <p className="text-sm text-gray-600">{state.data.model}</p>
              </div>
              <div>
                <p className="font-medium">Year</p>
                <p className="text-sm text-gray-600">{state.data.year}</p>
              </div>
              <div>
                <p className="font-medium">Color</p>
                <p className="text-sm text-gray-600">{state.data.color}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Date & Time */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">Appointment</h3>
                <p className="text-sm text-gray-600">
                  {format(state.data.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(BookingStep.DateTime)}
              >
                Edit
              </Button>
            </div>
            <div>
              <p className="font-medium">Time</p>
              <p className="text-sm text-gray-600">
                {format(new Date(`2000-01-01T${state.data.timeSlot}`), 'h:mm aa')}
              </p>
            </div>
          </div>
        </Card>

        {/* Contact Details */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">Contact Details</h3>
                <p className="text-sm text-gray-600">
                  {state.data.firstName} {state.data.lastName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(BookingStep.User)}
              >
                Edit
              </Button>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-gray-600">{state.data.email}</p>
            </div>
            <div>
              <p className="font-medium">Phone</p>
              <p className="text-sm text-gray-600">{state.data.phone}</p>
            </div>
          </div>
        </Card>
      </div>

      {state.data.notes && (
        <Card className="p-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Additional Notes</h3>
            <p className="text-sm text-gray-600">{state.data.notes}</p>
          </div>
        </Card>
      )}

      <div className="flex justify-between space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          Back to Details
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Confirming...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
} 