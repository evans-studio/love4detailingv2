'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AdminStats {
  totalBookings: number;
  totalUsers: number;
  totalVehicles: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchStats() {
      try {
        const [bookingsRes, usersRes, vehiclesRes] = await Promise.all([
          supabase.from('bookings').select('id', { count: 'exact' }),
          supabase.from('users').select('id', { count: 'exact' }),
          supabase.from('vehicles').select('id', { count: 'exact' }),
        ]);

        setStats({
          totalBookings: bookingsRes.count || 0,
          totalUsers: usersRes.count || 0,
          totalVehicles: vehiclesRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [supabase]);

  if (loading) {
    return <LoadingState>Loading admin dashboard...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900">Total Bookings</h3>
          <p className="mt-2 text-3xl font-semibold text-primary-600">
            {stats?.totalBookings || 0}
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
          <p className="mt-2 text-3xl font-semibold text-primary-600">
            {stats?.totalUsers || 0}
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900">Total Vehicles</h3>
          <p className="mt-2 text-3xl font-semibold text-primary-600">
            {stats?.totalVehicles || 0}
          </p>
        </Card>
      </div>
    </div>
  );
} 