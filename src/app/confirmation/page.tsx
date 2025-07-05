import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/Card';
import { ConfirmationDetails } from '@/components/booking/ConfirmationDetails';

interface BookingConfirmationProps {
  searchParams: {
    booking?: string;
    setup?: string;
    userExists?: string;
    hasPassword?: string;
  };
}

async function BookingConfirmation({ 
  bookingId, 
  setupLink,
  userExists,
  hasPassword 
}: { 
  bookingId: string; 
  setupLink?: string;
  userExists?: boolean;
  hasPassword?: boolean;
}) {
  const supabase = createServerComponentClient({ cookies });

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(
        registration,
        make,
        model,
        year,
        color,
        vehicle_size:vehicle_sizes(label, price_pence)
      ),
      time_slot:time_slots(slot_date, slot_time)
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    return (
      <Card className="p-6">
        <div className="text-red-500">
          Booking not found. Please contact support if you believe this is an error.
        </div>
      </Card>
    );
  }

  return (
    <ConfirmationDetails 
      booking={booking} 
      setupLink={setupLink}
      userExists={userExists}
      hasPassword={hasPassword}
    />
  );
}

export default function ConfirmationPage({ searchParams }: BookingConfirmationProps) {
  const bookingId = searchParams.booking;
  const setupLink = searchParams.setup;
  const userExists = searchParams.userExists === 'true';
  const hasPassword = searchParams.hasPassword === 'true';

  if (!bookingId) {
    return (
      <Card className="p-6">
        <div className="text-red-500">
          No booking ID provided. Please contact support if you believe this is an error.
        </div>
      </Card>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingConfirmation 
        bookingId={bookingId} 
        setupLink={setupLink}
        userExists={userExists}
        hasPassword={hasPassword}
      />
    </Suspense>
  );
} 