'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
  AlertCircle,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { BookingSummaryRow } from '@/types/database.types';

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      fetchUserBookings();
    }
  }, [user]);

  const fetchUserBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user profile to match with bookings
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Fetch bookings using the customer email and user ID
      const { data, error: fetchError } = await supabase
        .from('booking_summaries')
        .select('*')
        .or(`customer_email.eq.${user.email},user_full_name.eq.${profile?.full_name}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, icon: AlertCircle, label: 'Pending Confirmation' },
      confirmed: { variant: 'info' as const, icon: CheckCircle, label: 'Confirmed' },
      in_progress: { variant: 'primary' as const, icon: Clock, label: 'In Progress' },
      completed: { variant: 'success' as const, icon: CheckCircle, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelled' },
      no_show: { variant: 'secondary' as const, icon: XCircle, label: 'No Show' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatPrice = (pricePence: number) => `£${(pricePence / 100).toFixed(2)}`;
  const formatDate = (dateString: string) => format(new Date(dateString), 'dd/MM/yyyy');
  const formatTime = (timeString: string) => format(new Date(`2000-01-01T${timeString}`), 'HH:mm');

  if (loading) {
    return <LoadingState>Loading your bookings...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#F2F2F2]">My Bookings</h1>
          <p className="text-[#C7C7C7] mt-1">View and manage your booking history</p>
        </div>
        <Link href="/booking/services">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">{bookings.length}</div>
          <div className="text-sm text-[#C7C7C7]">Total Bookings</div>
        </Card>
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">
            {bookings.filter(b => b.status === 'completed').length}
          </div>
          <div className="text-sm text-[#C7C7C7]">Completed</div>
        </Card>
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">
            {bookings.filter(b => new Date(b.slot_date) >= new Date()).length}
          </div>
          <div className="text-sm text-[#C7C7C7]">Upcoming</div>
        </Card>
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">
            {formatPrice(bookings.reduce((sum, b) => sum + b.total_price_pence, 0))}
          </div>
          <div className="text-sm text-[#C7C7C7]">Total Spent</div>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <Card className="p-12 text-center bg-[#1E1E1E] border-gray-800">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[#F2F2F2] mb-2">No bookings yet</h3>
          <p className="text-[#C7C7C7] mb-6">
            You haven't made any bookings with us yet. Book your first service to get started!
          </p>
          <Link href="/booking/services">
            <Button size="lg" className="flex items-center gap-2 mx-auto">
              <Plus className="h-5 w-5" />
              Book Your First Service
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="p-6 bg-[#1E1E1E] border-gray-800">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left Section - Booking Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#F2F2F2]">
                        {booking.service_name || 'Vehicle Service'}
                      </h3>
                      <p className="text-sm text-[#8B8B8B]">
                        Reference: {booking.booking_reference}
                      </p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date & Time */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#262626] rounded-lg">
                        <Calendar className="h-4 w-4 text-[#9146FF]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#8B8B8B]">Date & Time</p>
                        <p className="text-[#F2F2F2] font-medium">
                          {formatDate(booking.slot_date)}
                        </p>
                        <p className="text-sm text-[#C7C7C7] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(booking.start_time)}
                        </p>
                      </div>
                    </div>

                    {/* Vehicle */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#262626] rounded-lg">
                        <Car className="h-4 w-4 text-[#9146FF]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#8B8B8B]">Vehicle</p>
                        {booking.vehicle_make && booking.vehicle_model ? (
                          <>
                            <p className="text-[#F2F2F2] font-medium">
                              {booking.vehicle_make} {booking.vehicle_model}
                            </p>
                            <p className="text-sm text-[#C7C7C7]">
                              {booking.vehicle_registration}
                            </p>
                          </>
                        ) : (
                          <p className="text-[#F2F2F2] font-medium">Vehicle details provided</p>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#262626] rounded-lg">
                        <CreditCard className="h-4 w-4 text-[#9146FF]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#8B8B8B]">Total Price</p>
                        <p className="text-[#F2F2F2] font-medium text-lg">
                          {formatPrice(booking.total_price_pence)}
                        </p>
                        <p className="text-sm text-[#C7C7C7]">
                          {booking.payment_status || 'Cash payment'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(booking.notes || booking.customer_instructions) && (
                    <div className="p-3 bg-[#262626] rounded-lg">
                      <p className="text-sm text-[#8B8B8B] mb-1">Notes</p>
                      <p className="text-[#F2F2F2] text-sm">
                        {booking.customer_instructions || booking.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Section - Actions */}
                <div className="flex flex-row lg:flex-col gap-2">
                  <Link href={`/dashboard/bookings/${booking.id}`} className="flex-1 lg:flex-none">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                  
                  {booking.status === 'pending' && (
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                      Cancel
                    </Button>
                  )}
                  
                  {booking.status === 'completed' && (
                    <Button variant="ghost" size="sm" className="text-[#9146FF] hover:text-[#9146FF]/80">
                      Book Again
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-6 bg-[#1E1E1E] border-gray-800">
        <h3 className="text-lg font-semibold text-[#F2F2F2] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/booking/services">
            <Button variant="outline" className="w-full justify-start gap-3">
              <Plus className="h-4 w-4" />
              Book New Service
            </Button>
          </Link>
          <Link href="/dashboard/vehicles">
            <Button variant="outline" className="w-full justify-start gap-3">
              <Car className="h-4 w-4" />
              Manage Vehicles
            </Button>
          </Link>
          <Link href="/dashboard/profile">
            <Button variant="outline" className="w-full justify-start gap-3">
              <Users className="h-4 w-4" />
              Update Profile
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}