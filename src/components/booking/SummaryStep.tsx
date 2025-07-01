'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { createBooking } from '@/lib/api/booking';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';

export function SummaryStep() {
  const router = useRouter();
  const { state, dispatch } = useBooking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { vehicle, customer, timeSlot, vehicleSize } = state.data;

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: BookingStep.DateTime });
  };

  const handleSubmit = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Check if user is authenticated
      if (!state.authStatus.isAuthenticated) {
        // Store booking data in session storage
        sessionStorage.setItem('pendingBooking', JSON.stringify(state));
        // Redirect to sign in
        router.push('/auth/sign-in?redirect=/book');
        return;
      }

      // Proceed with booking submission if authenticated
      const booking = await createBooking(state);
      router.push(`/confirmation?bookingId=${booking.id}`);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create booking' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  if (!vehicle || !customer || !timeSlot || !vehicleSize) {
    return (
      <Card className="p-6">
        <div className="text-red-500">
          Missing required booking information. Please go back and complete all steps.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
          <p className="text-gray-600 mb-4">
            Please review your booking details before confirming.
          </p>
        </div>

        <div className="space-y-6">
          {/* Vehicle Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Vehicle Details</h3>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-gray-600">Registration</dt>
                <dd className="font-medium">{vehicle.registration}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Make & Model</dt>
                <dd className="font-medium">{vehicle.make} {vehicle.model}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Year</dt>
                <dd className="font-medium">{vehicle.year}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Color</dt>
                <dd className="font-medium">{vehicle.color}</dd>
              </div>
            </dl>
          </div>

          {/* Customer Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Customer Details</h3>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-gray-600">Name</dt>
                <dd className="font-medium">{customer.firstName} {customer.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Email</dt>
                <dd className="font-medium">{customer.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Phone</dt>
                <dd className="font-medium">{customer.phone}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Address</dt>
                <dd className="font-medium">
                  {customer.address_line1}
                  {customer.address_line2 && <>, {customer.address_line2}</>}
                  <br />
                  {customer.city}, {customer.postcode}
                </dd>
              </div>
            </dl>
          </div>

          {/* Service Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Service Details</h3>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-gray-600">Vehicle Size</dt>
                <dd className="font-medium">{vehicleSize.label}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Price</dt>
                <dd className="font-medium text-primary-500">
                  {formatCurrency(vehicleSize.price_pence / 100)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Date</dt>
                <dd className="font-medium">{formatDate(timeSlot.slot_date)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Time</dt>
                <dd className="font-medium">{formatTime(timeSlot.slot_time)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Confirming booking...' : 'Confirm Booking'}
          </Button>
        </div>
      </div>
    </Card>
  );
} 