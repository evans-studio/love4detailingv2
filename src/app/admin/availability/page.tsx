'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
// Using alert() for notifications to match existing codebase pattern
import WeeklyScheduleConfig from '@/components/admin/WeeklyScheduleConfig';
import { AvailabilityCalendar } from '@/components/admin/AvailabilityCalendar';
import { EditBookingModal } from '@/components/admin/EditBookingModal';
import { 
  Calendar as CalendarIcon, 
  Settings, 
  Clock,
  TrendingUp,
  Users,
  AlertCircle
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  vehicle_id: string;
  slot_id: string;
  status: string;
  payment_status: string;
  total_price_pence: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes?: string;
  created_at: string;
  vehicle?: {
    registration: string;
    make: string;
    model: string;
    year: string;
    color: string;
  } | null;
  available_slot?: {
    slot_date: string;
    start_time: string;
    end_time: string;
    current_bookings: number;
    max_bookings: number;
  } | null;
}

interface AvailabilityStats {
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  upcomingBookings: number;
}

export default function AvailabilityManagement() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<AvailabilityStats>({ 
    totalSlots: 0, 
    bookedSlots: 0, 
    availableSlots: 0, 
    upcomingBookings: 0 
  });
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // Using alert() for notifications
  const supabase = createClientComponentClient();

  const handleScheduleUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    loadStats();
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data: slotsData, error: slotsError } = await supabase
        .from('time_slots')
        .select('is_available')
        .gte('slot_date', new Date().toISOString().split('T')[0]);

      if (slotsError) throw slotsError;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, time_slots(slot_date)')
        .eq('status', 'confirmed')
        .gte('time_slots.slot_date', new Date().toISOString().split('T')[0]);

      if (bookingsError) throw bookingsError;

      const totalSlots = slotsData?.length || 0;
      const bookedSlots = slotsData?.filter(slot => !slot.is_available).length || 0;
      const availableSlots = slotsData?.filter(slot => slot.is_available).length || 0;
      const upcomingBookings = bookingsData?.length || 0;

      setStats({ totalSlots, bookedSlots, availableSlots, upcomingBookings });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [supabase]);

  const handleSlotClick = useCallback(async (date: string, slotNumber: number) => {
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          vehicles(
            registration,
            make,
            model,
            year,
            color,
            vehicle_sizes(
              label,
              price_pence
            )
          ),
          time_slots(
            slot_date,
            slot_time,
            slot_number
          )
        `)
        .eq('time_slots.slot_date', date)
        .eq('time_slots.slot_number', slotNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (booking) {
        setEditingBooking(booking);
        setShowEditModal(true);
      } else {
        alert('This slot is available but has no booking.');
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      alert('Failed to load booking details. Please try again.');
    }
  }, [supabase]);

  const handleBookingUpdate = useCallback(async (bookingId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: updates.status,
          payment_status: updates.payment_status,
          notes: updates.notes,
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Handle slot change if needed
      if (updates.slot_date || updates.slot_number) {
        // This would involve more complex logic to update time slots
        // For now, we'll just refresh the data
        handleScheduleUpdate();
      }

      alert('Booking updated successfully!');
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }, [supabase, handleScheduleUpdate]);

  // Load initial stats
  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F2F2F2]">Availability Management</h1>
          <p className="text-[#C7C7C7] mt-1">
            Manage your booking schedule and time slot availability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-8 w-8 text-purple-600" />
          <Settings className="h-8 w-8 text-gray-400" />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1E1E1E] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#C7C7C7]">Total Slots</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F2F2F2]">{stats.totalSlots}</div>
            <p className="text-xs text-[#8B8B8B]">Available for booking</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1E1E1E] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#C7C7C7]">Booked Slots</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F2F2F2]">{stats.bookedSlots}</div>
            <p className="text-xs text-[#8B8B8B]">Currently occupied</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1E1E1E] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#C7C7C7]">Available Slots</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F2F2F2]">{stats.availableSlots}</div>
            <p className="text-xs text-[#8B8B8B]">Ready for booking</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1E1E1E] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#C7C7C7]">Upcoming Bookings</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F2F2F2]">{stats.upcomingBookings}</div>
            <p className="text-xs text-[#8B8B8B]">Confirmed appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule Configuration */}
      <WeeklyScheduleConfig />

      {/* Availability Calendar */}
      <AvailabilityCalendar 
        onSlotClick={handleSlotClick}
        refreshKey={refreshKey}
      />

      {/* Edit Booking Modal */}
      <EditBookingModal
        booking={editingBooking}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingBooking(null);
        }}
        onSave={handleBookingUpdate}
      />

      {/* Guide Card */}
      <Card className="bg-[#1E1E1E] border-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-[#9146FF]">Availability Management Guide</p>
              <div className="text-sm text-[#C7C7C7] space-y-1">
                <p>• Configure your weekly schedule template to set working days and available slots</p>
                <p>• Use the calendar to view availability and manage individual bookings</p>
                <p>• Click on calendar slots to view or edit existing bookings</p>
                <p>• Generate weekly slots automatically based on your schedule template</p>
                <p>• Track real-time statistics for your booking capacity</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}