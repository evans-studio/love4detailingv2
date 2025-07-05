'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/LoadingState';
import { format } from 'date-fns';

interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  vehicle_id: string;
  time_slot_id: string;
  created_at: string;
  user: {
    email: string;
    full_name: string;
    phone: string | null;
  };
  vehicle: {
    registration: string;
    make: string | null;
    model: string | null;
  };
  time_slot: {
    slot_date: string;
    slot_time: string;
  };
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchBookings() {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            user:users(email, full_name, phone),
            vehicle:vehicles(registration, make, model),
            time_slot:time_slots(slot_date, slot_time)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [supabase]);

  if (loading) {
    return <LoadingState>Loading bookings...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">All Bookings</h1>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {booking.booking_reference}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{booking.user.full_name}</div>
                  <div className="text-xs text-gray-400">{booking.user.email}</div>
                  {booking.user.phone && (
                    <div className="text-xs text-gray-400">{booking.user.phone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{booking.vehicle.registration}</div>
                  {booking.vehicle.make && booking.vehicle.model && (
                    <div className="text-xs text-gray-400">
                      {booking.vehicle.make} {booking.vehicle.model}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    {format(new Date(booking.time_slot.slot_date), 'dd MMM yyyy')}
                  </div>
                  <div className="text-xs text-gray-400">
                    {booking.time_slot.slot_time.slice(0, 5)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(booking.created_at), 'dd MMM yyyy HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 