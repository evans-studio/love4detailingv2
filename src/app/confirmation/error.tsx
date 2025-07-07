'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ConfirmationError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Confirmation page error:', error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 48 48"
          >
            <circle
              className="opacity-25"
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              d="M16 16l16 16m0-16L16 32"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          We encountered an error while processing your booking confirmation.
          Please try again or contact our support team if the problem persists.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/bookings')}
            className="w-full sm:w-auto"
          >
            View My Bookings
          </Button>
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/book')}
            className="w-full sm:w-auto"
          >
            Start New Booking
          </Button>
        </div>
      </div>
    </div>
  );
} 