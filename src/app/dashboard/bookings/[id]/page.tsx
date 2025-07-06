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
    confirmed: 'bg-[#28C76F]/20 text-[#28C76F] border-[#28C76F]/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    cancelled: 'bg-[#BA0C2F]/20 text-[#BA0C2F] border-[#BA0C2F]/30',
  } as const;

  const color = statusColors[status.toLowerCase() as BookingStatus] || 'bg-[#262626] text-[#C7C7C7] border-gray-800';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
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
          <h1 className="text-2xl font-bold mb-2 text-[#F2F2F2]">Booking Details</h1>
          <p className="text-[#C7C7C7]">Reference: {booking.booking_reference}</p>
        </div>
        <StatusBadge status={booking.status as BookingStatus} />
      </div>

      {/* Booking Details */}
      <Card className="mb-6 p-6 bg-[#1E1E1E] border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-[#F2F2F2]">Booking Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-4 text-[#F2F2F2]">Appointment Details</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <CalendarIcon className="w-5 h-5" />
                {format(new Date(booking.time_slots.slot_date), 'EEEE, MMMM d, yyyy')}
              </li>
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <ClockIcon className="w-5 h-5" />
                {format(new Date(`2000-01-01T${booking.time_slots.slot_time}`), 'h:mm aa')}
              </li>
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <CurrencyPoundIcon className="w-5 h-5" />
                {(booking.total_price_pence / 100).toFixed(2)}
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-[#F2F2F2]">Vehicle Details</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <span className="font-medium text-[#8B8B8B]">Registration:</span>
                {booking.vehicles.registration}
              </li>
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <span className="font-medium text-[#8B8B8B]">Make & Model:</span>
                {booking.vehicles.make} {booking.vehicles.model}
              </li>
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <span className="font-medium text-[#8B8B8B]">Year:</span>
                {booking.vehicles.year}
              </li>
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <span className="font-medium text-[#8B8B8B]">Color:</span>
                {booking.vehicles.color}
              </li>
              <li className="flex items-center gap-2 text-[#C7C7C7]">
                <span className="font-medium text-[#8B8B8B]">Size:</span>
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