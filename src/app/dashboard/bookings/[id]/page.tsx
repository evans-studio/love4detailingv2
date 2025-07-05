import { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CurrencyPoundIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Booking Details - Love4Detailing',
  description: 'View your booking details and status.',
};

async function getBookingDetails(id: string) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      vehicles (
        registration,
        make,
        model,
        year,
        color,
        size
      ),
      vehicle_sizes (
        label,
        price_pence,
        description
      ),
      time_slots (
        slot_date,
        slot_time
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!booking) throw new Error('Booking not found');

  return booking;
}

type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

function StatusBadge({ status }: { status: BookingStatus }) {
  const statusColors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  } as const;

  const color = statusColors[status.toLowerCase() as BookingStatus] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function BookingDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await getBookingDetails(params.id);
  const isUpcoming = new Date(booking.time_slots.slot_date) > new Date();
  const canCancel = isUpcoming && booking.status.toLowerCase() === 'confirmed';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Booking Details</h1>
          <p className="text-gray-600">Reference: {booking.booking_reference}</p>
        </div>
        <StatusBadge status={booking.status as BookingStatus} />
      </div>

      {/* Booking Details */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Booking Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-4">Appointment Details</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-600">
                <CalendarIcon className="w-5 h-5" />
                {format(new Date(booking.time_slots.slot_date), 'EEEE, MMMM d, yyyy')}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <ClockIcon className="w-5 h-5" />
                {format(new Date(`2000-01-01T${booking.time_slots.slot_time}`), 'h:mm aa')}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <CurrencyPoundIcon className="w-5 h-5" />
                {(booking.total_price_pence / 100).toFixed(2)}
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4">Vehicle Details</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Registration:</span>
                {booking.vehicles.registration}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Make & Model:</span>
                {booking.vehicles.make} {booking.vehicles.model}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Year:</span>
                {booking.vehicles.year}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Color:</span>
                {booking.vehicles.color}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Size:</span>
                {booking.vehicle_sizes.label}
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Actions */}
      {canCancel && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => {/* Add cancel booking logic */}}
          >
            Cancel Booking
          </Button>
        </div>
      )}
    </div>
  );
} 