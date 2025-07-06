'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/context/BookingContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { BookingService } from '@/lib/services/booking.service';
import { LoadingState } from '@/components/ui/LoadingState';

export function SummaryStep() {
  const router = useRouter();
  const { state } = useBooking();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { vehicle, customer, timeSlot, vehicleSize } = state.data;

  useEffect(() => {
    if (!vehicle || !customer || !timeSlot || !vehicleSize) {
      router.push('/book');
    }
  }, [vehicle, customer, timeSlot, vehicleSize, router]);

  if (!vehicle || !customer || !timeSlot || !vehicleSize) {
    return null;
  }

  const handleConfirmBooking = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const bookingService = new BookingService();
      const result = await bookingService.createBooking({
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
        slotId: timeSlot.id,
        vehicleId: undefined, // Will be handled by the service
        userId: undefined, // Will be determined by service
      });

      // Redirect to confirmation page with booking reference
      const params = new URLSearchParams({
        booking: result.booking_reference
      });

      router.push(`/confirmation?${params.toString()}`);
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Booking Summary</h2>
          <p className="text-gray-600 mt-2">
            Please review your booking details before confirming
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

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

        {/* Booking Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Booking Details</h3>
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
              <dd className="font-medium">{formatTime(timeSlot.start_time)}</dd>
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
          </dl>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={handleConfirmBooking}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? <LoadingState>Confirming Booking...</LoadingState> : 'Confirm Booking'}
          </Button>
        </div>
      </div>
    </Card>
  );
} 