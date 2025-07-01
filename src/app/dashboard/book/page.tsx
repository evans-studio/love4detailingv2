import { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { services } from '@/data/services';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'Book Again - Love4Detailing',
  description: 'Book another detailing service with your saved details.',
};

async function getPreviousBookings() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('userId', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return bookings || [];
}

function ServiceCard({ service }: { service: any }) {
  return (
    <Card className="p-6 hover:bg-gray-50 transition-colors">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
        <p className="text-sm text-gray-600">{service.description}</p>
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-sm">
          <span className="text-gray-600">Duration:</span> {service.duration}
        </p>
        <p className="text-sm">
          <span className="text-gray-600">Price:</span> £{(service.price / 100).toFixed(2)}
        </p>
      </div>
      <Button asChild className="w-full">
        <Link
          href={{
            pathname: '/book',
            query: { service: service.id },
          }}
        >
          Book This Service
        </Link>
      </Button>
    </Card>
  );
}

function PreviousBookingCard({ booking }: { booking: any }) {
  const service = services.find(s => s.id === booking.serviceId);
  if (!service) return null;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold">{service.name}</h3>
        <p className="text-sm text-gray-600">
          {format(new Date(booking.date), 'MMMM d, yyyy')} at{' '}
          {format(new Date(`2000-01-01T${booking.timeSlot}`), 'h:mm aa')}
        </p>
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-sm">
          <span className="text-gray-600">Vehicle:</span>{' '}
          {booking.make} {booking.model} ({booking.registration})
        </p>
      </div>
      <Button
        asChild
        className="w-full"
      >
        <Link
          href={{
            pathname: '/book',
            query: {
              service: service.id,
              vehicle: booking.registration,
            },
          }}
        >
          Book Same Service
        </Link>
      </Button>
    </Card>
  );
}

export default async function BookAgainPage() {
  const previousBookings = await getPreviousBookings();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book a Service</h1>
        <p className="text-gray-600">
          Choose from your previous services or explore our full range of detailing options.
        </p>
      </div>

      {previousBookings.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Book Previous Service</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {previousBookings.map((booking: any) => (
              <PreviousBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">All Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>
    </div>
  );
} 