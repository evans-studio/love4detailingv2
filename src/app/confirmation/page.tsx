'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/context/BookingContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';

export default function ConfirmationPage() {
  const router = useRouter();
  const { state, dispatch } = useBooking();

  // If there's no booking data, redirect to booking page
  useEffect(() => {
    if (!state.data.vehicle || !state.data.timeSlot) {
      router.push('/book');
    }
  }, [state.data, router]);

  const { vehicle, customer, timeSlot, vehicleSize } = state.data;

  if (!vehicle || !customer || !timeSlot || !vehicleSize) {
    return null; // Will redirect in useEffect
  }

  const handleViewBookings = () => {
    // Reset booking state
    dispatch({ type: 'RESET_BOOKING' });
    router.push('/dashboard/bookings');
  };

  const handleNewBooking = () => {
    // Reset booking state
    dispatch({ type: 'RESET_BOOKING' });
    router.push('/book');
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          <div className="text-center">
            <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
            <p className="mt-2 text-gray-600">
              Thank you for booking with us. We've sent a confirmation email to {customer.email}.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
            <dl className="grid grid-cols-1 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <dt className="font-medium text-gray-900">Vehicle</dt>
                <dd className="mt-2 text-gray-600">
                  {vehicle.make} {vehicle.model} ({vehicle.registration})
                  <br />
                  {vehicle.year} • {vehicle.color}
                </dd>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <dt className="font-medium text-gray-900">Appointment</dt>
                <dd className="mt-2 text-gray-600">
                  {formatDate(timeSlot.slot_date)} at {formatTime(timeSlot.slot_time)}
                  <br />
                  {vehicleSize.label} - {formatCurrency(vehicleSize.price_pence / 100)}
                </dd>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <dt className="font-medium text-gray-900">Contact Details</dt>
                <dd className="mt-2 text-gray-600">
                  {customer.firstName} {customer.lastName}
                  <br />
                  {customer.phone}
                  <br />
                  {customer.address_line1}
                  {customer.address_line2 && <>, {customer.address_line2}</>}
                  <br />
                  {customer.city}, {customer.postcode}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <Button
              variant="outline"
              onClick={handleViewBookings}
              className="w-full sm:w-auto"
            >
              View My Bookings
            </Button>
            <Button
              onClick={handleNewBooking}
              className="w-full sm:w-auto"
            >
              Book Another Detail
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
} 