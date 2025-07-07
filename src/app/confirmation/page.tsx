import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/card';
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
        <Card className="p-6 bg-[#1E1E1E] border-gray-800 max-w-md mx-auto text-center">
          <div className="text-[#BA0C2F] mb-4">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold text-[#F2F2F2] mb-2">Booking Confirmation Not Found</h2>
            <p className="text-[#C7C7C7] mb-4">
              We couldn't find your booking confirmation. This might happen if:
            </p>
            <ul className="text-left text-[#C7C7C7] text-sm space-y-1 mb-6">
              <li>• You navigated here directly without completing a booking</li>
              <li>• The booking link has expired</li>
              <li>• There was an issue with your booking submission</li>
            </ul>
            <div className="space-y-3">
              <a
                href="/book"
                className="block w-full bg-[#9146FF] text-white py-2 px-4 rounded-lg hover:bg-[#7C3AED] transition-colors"
              >
                Make a New Booking
              </a>
              <a
                href="/"
                className="block w-full bg-[#2A2A2A] text-[#F2F2F2] py-2 px-4 rounded-lg hover:bg-[#3A3A3A] transition-colors"
              >
                Return to Homepage
              </a>
              <p className="text-xs text-[#C7C7C7] mt-4">
                If you just completed a booking and see this message, please contact support at{' '}
                <a href="mailto:support@love4detailing.com" className="text-[#9146FF] hover:underline">
                  support@love4detailing.com
                </a>
              </p>
            </div>
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