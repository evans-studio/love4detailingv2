import { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from '@/components/ui';
import Link from 'next/link';
import { UnmatchedVehiclesCard } from '@/components/admin/UnmatchedVehiclesCard';
import { QuickBook } from '@/components/dashboard/QuickBook';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard - Love4Detailing',
  description: 'View your booking history and manage your account.',
};

export default async function DashboardPage() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  const { data: recentBookings } = await supabase
    .from('booking_summaries')
    .select(`
      id,
      booking_reference,
      customer_name,
      vehicle_make,
      vehicle_model,
      vehicle_registration,
      vehicle_size,
      slot_date,
      start_time,
      total_price_pence,
      status,
      created_at
    `)
    .eq('user_full_name', user?.email) // Filter by user email since that's available
    .order('created_at', { ascending: false })
    .limit(2);

  // Get user's vehicles 
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', user?.id);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-[#F2F2F2]">Welcome Back</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickBook userVehicles={vehicles || []} />

          {/* Loyalty Points Card */}
          <Card className="bg-[#1E1E1E] border-gray-800">
            <CardHeader>
              <CardTitle className="text-[#F2F2F2]">Loyalty Points</CardTitle>
              <CardDescription className="text-[#C7C7C7]">Your rewards balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-5xl font-bold text-[#9146FF]">150</p>
                <p className="text-sm text-[#8B8B8B] mt-2">Points Available</p>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost">View History</Button>
              <Button variant="outline">Redeem Points</Button>
            </CardFooter>
          </Card>

          {/* Recent Bookings Card */}
          <Card className="bg-[#1E1E1E] border-gray-800">
            <CardHeader>
              <CardTitle className="text-[#F2F2F2]">Recent Bookings</CardTitle>
              <CardDescription className="text-[#C7C7C7]">Your booking history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings?.map((booking) => (
                  <div key={booking.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-[#F2F2F2]">
                        {booking.vehicle_size ? 
                          `${booking.vehicle_size.charAt(0).toUpperCase() + booking.vehicle_size.slice(1)} Vehicle` :
                          'Vehicle Service'
                        }
                      </p>
                      <p className="text-sm text-[#C7C7C7]">
                        {new Date(booking.slot_date).toLocaleDateString()}
                      </p>
                      {booking.vehicle_make && booking.vehicle_model && (
                        <p className="text-xs text-[#8B8B8B]">
                          {booking.vehicle_make} {booking.vehicle_model}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/dashboard/bookings/${booking.id}`} className="text-[#9146FF] hover:text-[#9146FF]/80">
                        View Details
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="w-full" asChild>
                <Link href="/dashboard/bookings" className="text-[#9146FF] hover:text-[#9146FF]/80">View All History</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Admin-only section */}
        {isAdmin && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-[#F2F2F2]">Admin Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnmatchedVehiclesCard />
              {/* Add other admin cards here */}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 