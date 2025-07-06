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
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
        <Card className="p-6 bg-[#1E1E1E] border-gray-800">
          <div className="text-[#BA0C2F]">
            Booking not found. Please contact support if you believe this is an error.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] p-4">
      <ConfirmationDetails 
        booking={booking} 
        setupLink={setupLink}
        userExists={userExists}
        hasPassword={hasPassword}
      />
    </div>
  );
}

export default function ConfirmationPage({ searchParams }: BookingConfirmationProps) {
  const bookingId = searchParams.booking;
  const setupLink = searchParams.setup;
  const userExists = searchParams.userExists === 'true';
  const hasPassword = searchParams.hasPassword === 'true';

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
        <Card className="p-6 bg-[#1E1E1E] border-gray-800">
          <div className="text-[#BA0C2F]">
            No booking ID provided. Please contact support if you believe this is an error.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      <Suspense fallback={<div className="flex items-center justify-center py-8 text-[#C7C7C7]">Loading...</div>}>
        <BookingConfirmation 
          bookingId={bookingId} 
          setupLink={setupLink}
          userExists={userExists}
          hasPassword={hasPassword}
        />
      </Suspense>
    </div>
  );
} 