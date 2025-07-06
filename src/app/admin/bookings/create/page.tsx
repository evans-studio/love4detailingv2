'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Alert } from '@/components/ui/Alert';
import { ArrowLeft, Plus, Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  size: string;
}

interface VehicleSize {
  id: string;
  name: string;
  base_price_pence: number;
}

interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
}

export default function CreateManualBooking() {
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleSizes, setVehicleSizes] = useState<VehicleSize[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    user_id: '',
    vehicle_id: '',
    time_slot_id: '',
    full_name: '',
    email: '',
    phone: '',
    special_requests: '',
    admin_notes: ''
  });

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, vehiclesRes, vehicleSizesRes, timeSlotsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, email, full_name')
          .neq('role', 'admin')
          .order('full_name'),
        supabase
          .from('vehicles')
          .select('id, registration, make, model, size')
          .order('registration'),
        supabase
          .from('vehicle_sizes')
          .select('id, name, base_price_pence')
          .order('name'),
        supabase
          .from('time_slots')
          .select('id, slot_date, slot_time, is_available')
          .eq('is_available', true)
          .gte('slot_date', new Date().toISOString().split('T')[0])
          .order('slot_date')
          .order('slot_time')
          .limit(50)
      ]);

      if (usersRes.error) throw usersRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (vehicleSizesRes.error) throw vehicleSizesRes.error;
      if (timeSlotsRes.error) throw timeSlotsRes.error;

      setUsers(usersRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setVehicleSizes(vehicleSizesRes.data || []);
      setTimeSlots(timeSlotsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data for booking creation');
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (userId: string) => {
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        user_id: userId,
        full_name: selectedUser.full_name || '',
        email: selectedUser.email || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        user_id: userId,
        full_name: '',
        email: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.user_id || !formData.vehicle_id || !formData.time_slot_id) {
        throw new Error('Please fill in all required fields');
      }

      // Get the selected vehicle and vehicle size for pricing
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
      const selectedVehicleSize = vehicleSizes.find(vs => vs.name === selectedVehicle?.size);
      
      if (!selectedVehicleSize) {
        throw new Error('Unable to determine vehicle pricing');
      }

      const bookingData = {
        user_id: formData.user_id,
        vehicle_id: formData.vehicle_id,
        time_slot_id: formData.time_slot_id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        special_requests: formData.special_requests || null,
        admin_notes: formData.admin_notes || null,
        total_price_pence: selectedVehicleSize.base_price_pence,
        status: 'confirmed',
        created_by_admin: true
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      // Update time slot availability
      await supabase
        .from('time_slots')
        .update({ is_available: false })
        .eq('id', formData.time_slot_id);

      setSuccess('Manual booking created successfully!');
      
      // Redirect to bookings page after 2 seconds
      setTimeout(() => {
        router.push('/admin/bookings');
      }, 2000);

    } catch (error) {
      console.error('Error creating booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState>Loading booking creation form...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/bookings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Manual Booking</h1>
          <p className="text-gray-600">Create a new booking for a customer</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
          {success}
        </Alert>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer *
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a customer...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Customer phone number"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Vehicle *
              </label>
              <select
                value={formData.vehicle_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration} - {vehicle.make} {vehicle.model} ({vehicle.size})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Slot Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Time</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time Slot *
              </label>
              <select
                value={formData.time_slot_id}
                onChange={(e) => setFormData(prev => ({ ...prev, time_slot_id: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select a time slot...</option>
                {timeSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {new Date(slot.slot_date).toLocaleDateString()} at {slot.slot_time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                  placeholder="Any special requests from the customer..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={formData.admin_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  placeholder="Internal notes about this booking..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Link href="/admin/bookings">
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Booking
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}