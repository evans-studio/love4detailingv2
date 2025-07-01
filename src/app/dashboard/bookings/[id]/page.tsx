import { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { format } from 'date-fns';
import { services } from '@/data/services';
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
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!booking) throw new Error('Booking not found');

  // Verify ownership
  if (booking.userId !== user.id) {
    throw new Error('Unauthorized');
  }

  return booking;
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    confirmed: {
      color: 'bg-green-100 text-green-800',
      icon: CheckCircleIcon,
    },
    cancelled: {
      color: 'bg-red-100 text-red-800',
      icon: XCircleIcon,
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-800',
      icon: ClockIcon,
    },
  }[status.toLowerCase()] || {
    color: 'bg-gray-100 text-gray-800',
    icon: ClockIcon,
  };

  const Icon = statusConfig.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
      <Icon className="w-4 h-4" />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export default async function BookingDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await getBookingDetails(params.id);
  const service = services.find(s => s.id === booking.serviceId);
  
  if (!service) throw new Error('Service not found');

  const isUpcoming = new Date(booking.date) > new Date();
  const canCancel = isUpcoming && booking.status.toLowerCase() === 'confirmed';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Booking Details</h1>
          <p className="text-gray-600">Reference: {booking.reference}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Service Details */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Service Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-4">{service.name}</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-600">
                <CalendarIcon className="w-5 h-5" />
                {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <ClockIcon className="w-5 h-5" />
                {format(new Date(`2000-01-01T${booking.timeSlot}`), 'h:mm aa')}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <CurrencyPoundIcon className="w-5 h-5" />
                {(service.price / 100).toFixed(2)}
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4">Service Includes</h3>
            <ul className="space-y-2">
              {service.includes.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Vehicle Details */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Vehicle Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Registration</p>
            <p className="font-medium">{booking.registration}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Make & Model</p>
            <p className="font-medium">{booking.make} {booking.model}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Year</p>
            <p className="font-medium">{booking.year}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Color</p>
            <p className="font-medium">{booking.color}</p>
          </div>
        </div>
      </Card>

      {/* Contact Details */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Contact Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium">{booking.firstName} {booking.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{booking.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{booking.phone}</p>
          </div>
        </div>
      </Card>

      {/* Additional Notes */}
      {booking.notes && (
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
          <p className="text-gray-600">{booking.notes}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Back to Dashboard
          </Link>
        </Button>
        {canCancel && (
          <Button
            variant="destructive"
            asChild
          >
            <Link href={`/dashboard/bookings/${booking.id}/cancel`}>
              Cancel Booking
            </Link>
          </Button>
        )}
        {isUpcoming && (
          <Button asChild>
            <Link href={`/dashboard/bookings/${booking.id}/reschedule`}>
              Reschedule
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
} 