'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/LoadingState';

interface ConfirmationDetailsProps {
  booking: {
    id: string;
    booking_reference: string;
    full_name: string;
    email: string;
    phone: string;
    vehicle: {
      registration: string;
      make: string;
      model: string;
      year: string;
      color: string;
      vehicle_size: {
        label: string;
        price_pence: number;
      };
    };
    time_slot: {
      slot_date: string;
      slot_time: string;
    };
  };
  setupLink?: string;
  userExists?: boolean;
  hasPassword?: boolean;
}

export function ConfirmationDetails({ booking, setupLink, userExists, hasPassword }: ConfirmationDetailsProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [fallbackInfo, setFallbackInfo] = useState<{ message: string; signInUrl?: string } | null>(null);

  const handleResendSetupEmail = async () => {
    setIsResending(true);
    setResendError(null);
    setFallbackInfo(null);

    try {
      const response = await fetch('/api/auth/resend-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: booking.email,
          bookingId: booking.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle fallback scenarios
        if (error.fallback && error.signInUrl) {
          setFallbackInfo({
            message: error.fallback,
            signInUrl: error.signInUrl
          });
        }
        
        throw new Error(error.error || error.message || 'Failed to resend setup email');
      }

      // Update setupLink with new link from response
      const data = await response.json();
      if (data.setupLink) {
        window.location.href = data.setupLink;
      }
    } catch (error) {
      setResendError(error instanceof Error ? error.message : 'Failed to resend setup email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-600">Booking Confirmed!</h1>
          <p className="text-gray-600 mt-2">
            Your booking reference is: <span className="font-medium">{booking.booking_reference}</span>
          </p>
        </div>

        {/* User Account Status Section */}
        {!hasPassword && (
          <div className={`border rounded-lg p-4 mb-6 ${userExists ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
            <h2 className="font-semibold text-lg mb-2">
              {userExists ? 'Complete Your Account Setup' : 'Set Up Your Account'}
            </h2>
            <p className="text-gray-700 mb-4">
              {userExists 
                ? 'We noticed you already have an account with us. Please set up your password to access your bookings and rewards.'
                : 'We\'ve created an account for you to manage your bookings and earn rewards. Please set your password to continue.'}
            </p>
            
            {setupLink ? (
              <Link href={setupLink}>
                <Button variant="default" className="w-full">
                  {userExists ? 'Complete Setup' : 'Set Up Account'}
                </Button>
              </Link>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleResendSetupEmail}
                  disabled={isResending}
                >
                  {isResending ? (
                    <LoadingState>Sending Email...</LoadingState>
                  ) : (
                    'Resend Setup Email'
                  )}
                </Button>
                {resendError && (
                  <p className="text-red-600 text-sm">{resendError}</p>
                )}
                {fallbackInfo && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm mb-3">{fallbackInfo.message}</p>
                    {fallbackInfo.signInUrl && (
                      <Link href={fallbackInfo.signInUrl}>
                        <Button variant="outline" size="sm" className="w-full">
                          Go to Sign In Page
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {hasPassword && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-green-800">Welcome Back!</h2>
            <p className="text-green-700 mb-4">
              Please sign in to your account to view your booking details and earn rewards points.
            </p>
            <Link href={`/auth/sign-in?redirect=/dashboard/bookings/${booking.id}`}>
              <Button variant="default" className="w-full">
                Sign In
              </Button>
            </Link>
          </div>
        )}

        {/* Vehicle Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Vehicle Details</h3>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-sm text-gray-600">Registration</dt>
              <dd className="font-medium">{booking.vehicle.registration}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Make & Model</dt>
              <dd className="font-medium">{booking.vehicle.make} {booking.vehicle.model}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Year</dt>
              <dd className="font-medium">{booking.vehicle.year}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Color</dt>
              <dd className="font-medium">{booking.vehicle.color}</dd>
            </div>
          </dl>
        </div>

        {/* Booking Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Booking Details</h3>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-sm text-gray-600">Vehicle Size</dt>
              <dd className="font-medium">{booking.vehicle.vehicle_size.label}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Price</dt>
              <dd className="font-medium text-primary-500">
                {formatCurrency(booking.vehicle.vehicle_size.price_pence / 100)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Date</dt>
              <dd className="font-medium">{formatDate(booking.time_slot.slot_date)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Time</dt>
              <dd className="font-medium">{formatTime(booking.time_slot.slot_time)}</dd>
            </div>
          </dl>
        </div>

        {/* Customer Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Customer Details</h3>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-sm text-gray-600">Name</dt>
              <dd className="font-medium">{booking.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Email</dt>
              <dd className="font-medium">{booking.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Phone</dt>
              <dd className="font-medium">{booking.phone}</dd>
            </div>
          </dl>
        </div>

        <div className="flex justify-center pt-4">
          <Link href="/">
            <Button variant="outline">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
} 