'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { LoadingState } from '@/components/ui/LoadingState';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Calendar, 
  Car, 
  Clock, 
  CreditCard, 
  MapPin,
  Eye,
  Plus,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Booking {
  id: string;
  booking_reference: string;
  status: string;
  payment_status: string;
  total_price_pence: number;
  created_at: string;
  vehicles?: {
    registration: string;
    make: string;
    model: string;
    vehicle_sizes?: {
      label: string;
    };
  };
  time_slots?: {
    slot_date: string;
    slot_time: string;
  };
}

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Failed to load bookings');
      }
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setError('Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return <LoadingState>Loading your bookings...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F2F2F2]">My Bookings</h1>
          <p className="text-[#C7C7C7]">View and manage your detailing appointments</p>
        </div>
        <Button asChild>
          <Link href="/book" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Book Another Service
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}

      {bookings.length === 0 ? (
        <Card className="bg-[#1E1E1E] border-gray-800 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Calendar className="h-12 w-12 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-[#F2F2F2] mb-2">No bookings yet</h3>
              <p className="text-[#C7C7C7] mb-4">
                You haven't made any booking appointments yet. Book your first service to get started!
              </p>
              <Button asChild>
                <Link href="/book">Book Your First Service</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => (
            <Card key={booking.id} className="bg-[#1E1E1E] border-gray-800">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[#F2F2F2] mb-1">
                      {booking.booking_reference}
                    </h3>
                    <p className="text-sm text-[#C7C7C7]">
                      Booked on {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                    <Badge className={getPaymentStatusColor(booking.payment_status)}>
                      {booking.payment_status === 'pending' ? 'Pay on Completion' : booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-[#F2F2F2]">
                        {booking.vehicles?.registration || 'Vehicle TBD'}
                      </div>
                      <div className="text-sm text-[#C7C7C7]">
                        {booking.vehicles?.make} {booking.vehicles?.model}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-[#F2F2F2]">
                        {booking.time_slots?.slot_date 
                          ? format(new Date(booking.time_slots.slot_date), 'MMM dd, yyyy')
                          : 'Date TBD'
                        }
                      </div>
                      <div className="text-sm text-[#C7C7C7]">
                        {booking.time_slots?.slot_time || 'Time TBD'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-[#F2F2F2]">
                        £{((booking.total_price_pence || 0) / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-[#C7C7C7]">
                        {booking.vehicles?.vehicle_sizes?.label || 'Standard'} Service
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/bookings/${booking.id}`} className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}