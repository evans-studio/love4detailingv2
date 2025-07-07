'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loadingState';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { 
  CalendarDays, 
  Users, 
  Car, 
  DollarSign, 
  Clock, 
  Plus, 
  Settings,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

interface AdminStats {
  totalBookings: number;
  monthlyBookings: number;
  activeCustomers: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface UpcomingBooking {
  id: string;
  booking_reference: string;
  full_name: string;
  email: string;
  vehicles: {
    make: string | null;
    model: string | null;
    registration: string | null;
  };
  time_slots: {
    slot_date: string;
    slot_time: string;
  };
  total_price_pence: number;
  status: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // Fetch comprehensive stats
        const [bookingsRes, monthlyBookingsRes, usersRes, revenueRes, monthlyRevenueRes] = await Promise.all([
          supabase.from('bookings').select('id', { count: 'exact' }),
          supabase.from('bookings')
            .select('id', { count: 'exact' })
            .gte('created_at', startOfMonth.toISOString())
            .lt('created_at', startOfNextMonth.toISOString()),
          supabase.from('users').select('id', { count: 'exact' }).neq('role', 'admin'),
          supabase.from('bookings').select('total_price_pence'),
          supabase.from('bookings')
            .select('total_price_pence')
            .gte('created_at', startOfMonth.toISOString())
            .lt('created_at', startOfNextMonth.toISOString()),
        ]);

        // Calculate revenue
        const totalRevenue = (revenueRes.data || []).reduce((sum, booking) => sum + (booking.total_price_pence || 0), 0);
        const monthlyRevenue = (monthlyRevenueRes.data || []).reduce((sum, booking) => sum + (booking.total_price_pence || 0), 0);

        setStats({
          totalBookings: bookingsRes.count || 0,
          monthlyBookings: monthlyBookingsRes.count || 0,
          activeCustomers: usersRes.count || 0,
          totalRevenue: totalRevenue,
          monthlyRevenue: monthlyRevenue,
        });

        // Fetch upcoming bookings using booking_summaries view
        const { data: bookings } = await supabase
          .from('booking_summaries')
          .select(`
            id,
            booking_reference,
            customer_name,
            customer_email,
            total_price_pence,
            status,
            vehicle_make,
            vehicle_model,
            vehicle_registration,
            slot_date,
            start_time
          `)
          .eq('status', 'pending')
          .gte('slot_date', now.toISOString().split('T')[0])
          .order('slot_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5);

        // Transform the data to match our interface
        const transformedBookings = (bookings || []).map(booking => ({
          id: booking.id,
          booking_reference: booking.booking_reference,
          full_name: booking.customer_name,
          email: booking.customer_email,
          total_price_pence: booking.total_price_pence,
          status: booking.status,
          vehicles: {
            make: booking.vehicle_make,
            model: booking.vehicle_model,
            registration: booking.vehicle_registration
          },
          time_slots: {
            slot_date: booking.slot_date,
            slot_time: booking.start_time
          }
        }));

        setUpcomingBookings(transformedBookings);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [supabase]);

  if (loading) {
    return <LoadingState>Loading admin dashboard...</LoadingState>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#F2F2F2]">Admin Dashboard</h1>
          <p className="text-[#C7C7C7] mt-1">Welcome to the Love4Detailing control panel</p>
        </div>
        <div className="text-sm text-[#8B8B8B]">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-[#1E1E1E] border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#C7C7C7]">Total Bookings</p>
              <p className="text-2xl font-bold text-[#F2F2F2]">{stats?.totalBookings || 0}</p>
              <p className="text-xs text-[#8B8B8B] mt-1">All time</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#1E1E1E] border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#C7C7C7]">This Month</p>
              <p className="text-2xl font-bold text-[#F2F2F2]">{stats?.monthlyBookings || 0}</p>
              <p className="text-xs text-[#8B8B8B] mt-1">Bookings</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#1E1E1E] border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#C7C7C7]">Active Customers</p>
              <p className="text-2xl font-bold text-[#F2F2F2]">{stats?.activeCustomers || 0}</p>
              <p className="text-xs text-[#8B8B8B] mt-1">Registered users</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#1E1E1E] border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#C7C7C7]">Monthly Revenue</p>
              <p className="text-2xl font-bold text-[#F2F2F2]">
                {formatCurrency((stats?.monthlyRevenue || 0) / 100)}
              </p>
              <p className="text-xs text-[#8B8B8B] mt-1">
                Total: {formatCurrency((stats?.totalRevenue || 0) / 100)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <Card className="p-6 bg-[#1E1E1E] border-gray-800">
          <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/admin/bookings/create" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create Manual Booking
              </Button>
            </Link>
            <Link href="/admin/pricing" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Edit Pricing
              </Button>
            </Link>
            <Link href="/admin/bookings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                View Booking Logs
              </Button>
            </Link>
            <Link href="/admin/availability" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Manage Availability
              </Button>
            </Link>
          </div>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="p-6 lg:col-span-2 bg-[#1E1E1E] border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#F2F2F2]">Upcoming Bookings</h2>
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-[#8B8B8B]">No upcoming bookings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-[#262626] rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium text-[#F2F2F2]">{booking.full_name}</p>
                        <p className="text-sm text-[#C7C7C7]">
                          {booking.vehicles.make} {booking.vehicles.model} ({booking.vehicles.registration})
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#F2F2F2]">
                      {formatDate(booking.time_slots.slot_date)} at {formatTime(booking.time_slots.slot_time)}
                    </p>
                    <p className="text-sm text-[#C7C7C7]">
                      {formatCurrency(booking.total_price_pence / 100)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <Link href={`/admin/bookings/${booking.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 