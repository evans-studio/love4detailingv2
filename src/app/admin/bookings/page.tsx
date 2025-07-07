'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { 
  Search, 
  Filter, 
  Edit, 
  Calendar, 
  Clock,
  User,
  Car,
  Plus,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { BookingSummaryRow } from '@/types/database.types';

interface BookingFilters {
  status: string;
  dateRange: string;
  search: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' }
];

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'upcoming', label: 'Upcoming' }
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingSummaryRow[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookingFilters>({
    status: 'all',
    dateRange: 'all',
    search: ''
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('booking_summaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(booking => booking.status === filters.status);
    }

    // Date range filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filters.dateRange) {
      case 'today':
        filtered = filtered.filter(booking => 
          new Date(booking.slot_date) >= today &&
          new Date(booking.slot_date) < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        );
        break;
      case 'week':
        const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(booking => {
          const bookingDate = new Date(booking.slot_date);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        });
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        filtered = filtered.filter(booking => {
          const bookingDate = new Date(booking.slot_date);
          return bookingDate >= monthStart && bookingDate < monthEnd;
        });
        break;
      case 'upcoming':
        filtered = filtered.filter(booking => 
          new Date(booking.slot_date) >= today
        );
        break;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.customer_name?.toLowerCase().includes(searchLower) ||
        booking.customer_email?.toLowerCase().includes(searchLower) ||
        booking.booking_reference?.toLowerCase().includes(searchLower) ||
        booking.vehicle_registration?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setUpdating(bookingId);
      
      const { error: updateError } = await supabase
        .rpc('update_booking_status', {
          p_booking_id: bookingId,
          p_new_status: newStatus
        });

      if (updateError) throw updateError;

      // Refresh bookings
      await fetchBookings();
    } catch (err) {
      console.error('Error updating booking status:', err);
      setError('Failed to update booking status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, icon: AlertCircle, label: 'Pending' },
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
    return <LoadingState>Loading bookings...</LoadingState>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#F2F2F2]">Bookings Management</h1>
          <p className="text-[#C7C7C7] mt-1">Manage and track all customer bookings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/admin/bookings/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">{bookings.length}</div>
          <div className="text-sm text-[#C7C7C7]">Total Bookings</div>
        </Card>
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">
            {bookings.filter(b => b.status === 'pending').length}
          </div>
          <div className="text-sm text-[#C7C7C7]">Pending</div>
        </Card>
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">
            {bookings.filter(b => b.status === 'confirmed').length}
          </div>
          <div className="text-sm text-[#C7C7C7]">Confirmed</div>
        </Card>
        <Card className="p-4 bg-[#1E1E1E] border-gray-800">
          <div className="text-2xl font-bold text-[#F2F2F2]">
            {bookings.filter(b => b.status === 'completed').length}
          </div>
          <div className="text-sm text-[#C7C7C7]">Completed</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-[#1E1E1E] border-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8B8B8B]" />
              <Input
                placeholder="Search by name, email, reference, or registration..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 bg-[#262626] border-gray-700 text-[#F2F2F2]"
              />
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-40 bg-[#262626] border-gray-700 text-[#F2F2F2]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
          >
            <SelectTrigger className="w-40 bg-[#262626] border-gray-700 text-[#F2F2F2]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Bookings Table */}
      <Card className="bg-[#1E1E1E] border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="text-left p-4 text-[#C7C7C7] font-medium">Reference</th>
                <th className="text-left p-4 text-[#C7C7C7] font-medium">Customer</th>
                <th className="text-left p-4 text-[#C7C7C7] font-medium">Vehicle</th>
                <th className="text-left p-4 text-[#C7C7C7] font-medium">Date & Time</th>
                <th className="text-left p-4 text-[#C7C7C7] font-medium">Status</th>
                <th className="text-left p-4 text-[#C7C7C7] font-medium">Price</th>
                <th className="text-left p-4 text-[#C7C7C7] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-800 hover:bg-[#262626]">
                  <td className="p-4">
                    <div className="font-medium text-[#F2F2F2]">{booking.booking_reference}</div>
                    <div className="text-sm text-[#8B8B8B]">
                      {formatDate(booking.created_at)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#8B8B8B]" />
                      <div>
                        <div className="font-medium text-[#F2F2F2]">{booking.customer_name}</div>
                        <div className="text-sm text-[#8B8B8B]">{booking.customer_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-[#8B8B8B]" />
                      <div>
                        {booking.vehicle_make && booking.vehicle_model ? (
                          <>
                            <div className="font-medium text-[#F2F2F2]">
                              {booking.vehicle_make} {booking.vehicle_model}
                            </div>
                            <div className="text-sm text-[#8B8B8B]">{booking.vehicle_registration}</div>
                          </>
                        ) : (
                          <div className="text-sm text-[#8B8B8B]">No vehicle info</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#8B8B8B]" />
                      <div>
                        <div className="font-medium text-[#F2F2F2]">
                          {formatDate(booking.slot_date)}
                        </div>
                        <div className="text-sm text-[#8B8B8B] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(booking.start_time)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-[#F2F2F2]">
                      {formatPrice(booking.total_price_pence)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/bookings/${booking.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {booking.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          disabled={updating === booking.id}
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#F2F2F2] mb-2">No bookings found</h3>
              <p className="text-[#8B8B8B]">
                {filters.search || filters.status !== 'all' || filters.dateRange !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No bookings have been created yet'
                }
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}