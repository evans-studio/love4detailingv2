'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { 
  AlertCircle, 
  XCircle,
  Loader2
} from 'lucide-react';

interface CancelBookingButtonProps {
  bookingId: string;
  bookingReference: string;
  canCancel: boolean;
}

export function CancelBookingButton({ bookingId, bookingReference, canCancel }: CancelBookingButtonProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancelBooking = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      // Refresh the page to show updated status
      router.refresh();
      setShowConfirm(false);
      
      // Optionally redirect to bookings list
      // router.push('/dashboard/bookings');
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  if (!canCancel) {
    return null;
  }

  if (showConfirm) {
    return (
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </Alert>
        )}
        
        <div className="bg-[#1E1E1E] border border-red-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-[#F2F2F2] mb-1">
                Cancel Booking {bookingReference}?
              </h3>
              <p className="text-sm text-[#C7C7C7] mb-4">
                This action cannot be undone. Your booking will be cancelled and any scheduled time slot will be made available to other customers.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleCancelBooking}
                  disabled={isCancelling}
                  className="flex items-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Booking'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={isCancelling}
                >
                  Keep Booking
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2"
      >
        <XCircle className="h-4 w-4" />
        Cancel Booking
      </Button>
    </div>
  );
}