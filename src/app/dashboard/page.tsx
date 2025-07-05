import { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
    .from('bookings')
    .select(`
      *,
      vehicles (
        make,
        model,
        registration,
        vehicle_sizes (
          label,
          price_pence
        )
      ),
      time_slots (
        slot_date,
        slot_time
      )
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(2);

  // Get user's vehicles with their sizes
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      *,
      vehicle_sizes (
        id,
        label,
        description,
        price_pence
      )
    `);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Welcome Back</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickBook userVehicles={vehicles || []} />

          {/* Loyalty Points Card */}
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Points</CardTitle>
              <CardDescription>Your rewards balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-5xl font-bold text-primary-500">150</p>
                <p className="text-sm text-muted mt-2">Points Available</p>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost">View History</Button>
              <Button variant="outline">Redeem Points</Button>
            </CardFooter>
          </Card>

          {/* Recent Bookings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Your booking history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings?.map((booking) => (
                  <div key={booking.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{booking.vehicles.vehicle_sizes.label} Vehicle</p>
                      <p className="text-sm text-muted">
                        {new Date(booking.time_slots.slot_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="w-full" asChild>
                <Link href="/dashboard/bookings">View All History</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Admin-only section */}
        {isAdmin && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Admin Tools</h2>
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