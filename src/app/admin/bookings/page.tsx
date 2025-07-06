'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock,
  User,
  Car,
  Plus,
  Download,
  Save,
  X
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  vehicle_id: string;
  time_slot_id: string;
  status: string;
  payment_status: string;
  total_price_pence: number;
  full_name: string;
  email: string;
  phone: string;
  notes?: string;
  created_at: string;
  vehicle?: {
    registration: string;
    make: string;
    model: string;
    year: string;
    color: string;
    vehicle_size?: {
      label: string;
      price_pence: number;
    };
  } | null;
  time_slot?: {
    slot_date: string;
    slot_time: string;
  } | null;
}

interface BookingFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  vehicleSize: string;
}

const editBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  payment_status: z.enum(['pending', 'paid', 'failed']),
  notes: z.string().optional(),
  slot_date: z.string(),
  slot_time: z.string(),
});

type EditBookingFormData = z.infer<typeof editBookingSchema>;

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleSizes, setVehicleSizes] = useState<{ id: string; label: string }[]>([]);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filters, setFilters] = useState<BookingFilters>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    vehicleSize: ''
  });
  const supabase = createClientComponentClient();

  const editForm = useForm<EditBookingFormData>({
    resolver: zodResolver(editBookingSchema),
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };

    loadData();
  }, [supabase]);

  // Apply filters
  useEffect(() => {
    let filtered = [...bookings];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.booking_reference.toLowerCase().includes(searchLower) ||
        booking.full_name.toLowerCase().includes(searchLower) ||
        booking.email.toLowerCase().includes(searchLower) ||
        (booking.vehicle?.registration && booking.vehicle.registration.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(booking => booking.status === filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(booking => 
        booking.time_slot?.slot_date && new Date(booking.time_slot.slot_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(booking => 
        booking.time_slot?.slot_date && new Date(booking.time_slot.slot_date) <= new Date(filters.dateTo)
      );
    }

    // Vehicle size filter
    if (filters.vehicleSize) {
      filtered = filtered.filter(booking => 
        booking.vehicle?.vehicle_size?.label === filters.vehicleSize
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, filters]);

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      vehicleSize: ''
    });
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    editForm.reset({
      status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
      payment_status: booking.payment_status as 'pending' | 'paid' | 'failed',
      notes: booking.notes || '',
      slot_date: booking.time_slot?.slot_date || '',
      slot_time: booking.time_slot?.slot_time || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBooking = async (formData: EditBookingFormData) => {
    if (!editingBooking) return;

    try {
      setIsUpdating(true);

      // Update booking status and payment status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: formData.status,
          payment_status: formData.payment_status,
          notes: formData.notes,
        })
        .eq('id', editingBooking.id);

      if (bookingError) throw bookingError;

      // If time slot changed, update the time slot
      if (formData.slot_date !== editingBooking.time_slot?.slot_date || 
          formData.slot_time !== editingBooking.time_slot?.slot_time) {
        
        // Find or create new time slot
        const { data: existingSlot } = await supabase
          .from('time_slots')
          .select('id')
          .eq('slot_date', formData.slot_date)
          .eq('slot_time', formData.slot_time)
          .single();

        let timeSlotId = existingSlot?.id;

        if (!timeSlotId) {
          // Create new time slot
          const { data: newSlot, error: slotError } = await supabase
            .from('time_slots')
            .insert({
              slot_date: formData.slot_date,
              slot_time: formData.slot_time,
              is_available: false,
              is_booked: true,
            })
            .select('id')
            .single();

          if (slotError) throw slotError;
          timeSlotId = newSlot.id;
        }

        // Update booking with new time slot
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ time_slot_id: timeSlotId })
          .eq('id', editingBooking.id);

        if (updateError) throw updateError;

        // Mark old time slot as available
        await supabase
          .from('time_slots')
          .update({ is_booked: false, is_available: true })
          .eq('id', editingBooking.time_slot_id);
      }

      // Refresh bookings data
      await fetchData();
      setIsEditModalOpen(false);
      setEditingBooking(null);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      // Refresh bookings data
      await fetchData();
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking. Please try again.');
    }
  };

  const fetchData = async () => {
    try {
      // Fetch bookings with full details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          vehicles (
            registration,
            make,
            model,
            year,
            color,
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
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch vehicle sizes for filter
      const { data: sizesData, error: sizesError } = await supabase
        .from('vehicle_sizes')
        .select('id, label')
        .order('label');

      if (sizesError) throw sizesError;

      setBookings(bookingsData || []);
      setFilteredBookings(bookingsData || []);
      setVehicleSizes(sizesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const paymentConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
    };
    const config = paymentConfig[paymentStatus as keyof typeof paymentConfig] || { color: 'bg-gray-100 text-gray-800', label: paymentStatus };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return <LoadingState>Loading bookings...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#F2F2F2]">Booking Management</h1>
          <p className="text-[#C7C7C7] mt-1">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/bookings/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-[#1E1E1E] border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Reference, name, email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#C7C7C7] mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Bookings Table */}
      <Card className="bg-[#1E1E1E] border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-[#262626]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F2F2F2] uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F2F2F2] uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F2F2F2] uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F2F2F2] uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F2F2F2] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F2F2F2] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#F2F2F2] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#1E1E1E] divide-y divide-gray-800">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Calendar className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-500">
                        {bookings.length === 0 ? 'No bookings found' : 'No bookings match your filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[#262626]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#F2F2F2]">
                        {booking.booking_reference}
                      </div>
                      <div className="text-xs text-[#8B8B8B]">
                        {formatDate(booking.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-[#262626] flex items-center justify-center">
                            <User className="h-4 w-4 text-[#C7C7C7]" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-[#F2F2F2]">
                            {booking.full_name}
                          </div>
                          <div className="text-sm text-[#C7C7C7]">{booking.email}</div>
                          {booking.phone && (
                            <div className="text-xs text-[#8B8B8B]">{booking.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Car className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          {booking.vehicle ? (
                            <>
                              <div className="text-sm font-medium text-[#F2F2F2]">
                                {booking.vehicle.registration}
                              </div>
                              <div className="text-sm text-[#C7C7C7]">
                                {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.year})
                              </div>
                              <div className="text-xs text-[#8B8B8B]">
                                {booking.vehicle.vehicle_size?.label || 'Unknown size'} • {booking.vehicle.color}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-[#8B8B8B] italic">
                              Vehicle information unavailable
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          {booking.time_slot ? (
                            <>
                              <div className="text-sm font-medium text-[#F2F2F2]">
                                {booking.time_slot?.slot_date ? formatDate(booking.time_slot.slot_date) : 'No date'}
                              </div>
                              <div className="text-sm text-[#C7C7C7]">
                                {booking.time_slot?.slot_time ? formatTime(booking.time_slot.slot_time) : 'No time'}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-[#8B8B8B] italic">
                              Time slot unavailable
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getStatusBadge(booking.status)}
                        {getPaymentBadge(booking.payment_status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#F2F2F2]">
                        {formatCurrency(booking.total_price_pence / 100)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditBooking(booking)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteBooking(booking.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Booking Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl bg-[#1E1E1E] border-gray-800">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          
          {editingBooking && (
            <form onSubmit={editForm.handleSubmit(handleUpdateBooking)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                    Booking Status
                  </label>
                  <Select
                    value={editForm.watch('status')}
                    onValueChange={(value) => editForm.setValue('status', value as any)}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                  {editForm.formState.errors.status && (
                    <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.status.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                    Payment Status
                  </label>
                  <Select
                    value={editForm.watch('payment_status')}
                    onValueChange={(value) => editForm.setValue('payment_status', value as any)}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </Select>
                  {editForm.formState.errors.payment_status && (
                    <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.payment_status.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                    Date
                  </label>
                  <Input
                    type="date"
                    {...editForm.register('slot_date')}
                    error={!!editForm.formState.errors.slot_date}
                  />
                  {editForm.formState.errors.slot_date && (
                    <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.slot_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                    Time
                  </label>
                  <Input
                    type="time"
                    {...editForm.register('slot_time')}
                    error={!!editForm.formState.errors.slot_time}
                  />
                  {editForm.formState.errors.slot_time && (
                    <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.slot_time.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Notes
                </label>
                <textarea
                  {...editForm.register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-800 bg-[#262626] text-[#F2F2F2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#9146FF]"
                  placeholder="Add any notes about this booking..."
                />
                {editForm.formState.errors.notes && (
                  <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.notes.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <LoadingState className="h-4 w-4 mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Booking
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 