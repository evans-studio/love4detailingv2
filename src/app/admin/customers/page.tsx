'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Users, 
  Search, 
  Eye, 
  Car, 
  CalendarDays, 
  DollarSign,
  UserX,
  Mail,
  Phone
} from 'lucide-react';
import Link from 'next/link';

interface CustomerData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  bookings_count: number;
  vehicles_count: number;
  total_spent_pence: number;
  last_booking_date: string | null;
  reward_points: number;
  reward_tier: string;
}

interface CustomerDetail extends CustomerData {
  recent_bookings: Array<{
    id: string;
    booking_reference: string;
    total_price_pence: number;
    status: string;
    created_at: string;
    time_slots: {
      slot_date: string;
      slot_time: string;
    };
    vehicles: {
      make: string;
      model: string;
      registration: string;
    };
  }>;
  vehicles: Array<{
    id: string;
    make: string;
    model: string;
    registration: string;
    year: string;
    size_category: string;
  }>;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Get all customers (non-admin users) with aggregated stats
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get aggregated stats for each customer
      const customersWithStats = await Promise.all((users || []).map(async (user) => {
        const [
          { count: bookingsCount },
          { count: vehiclesCount },
          { data: bookings },
          { data: rewardData }
        ] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact' }).eq('user_id', user.id),
          supabase.from('vehicles').select('*', { count: 'exact' }).eq('user_id', user.id),
          supabase.from('bookings')
            .select('total_price_pence, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase.from('rewards')
            .select('points, tier')
            .eq('user_id', user.id)
            .single()
        ]);

        const totalSpent = (bookings || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
        const lastBooking = bookings && bookings.length > 0 ? bookings[0].created_at : null;

        return {
          ...user,
          bookings_count: bookingsCount || 0,
          vehicles_count: vehiclesCount || 0,
          total_spent_pence: totalSpent,
          last_booking_date: lastBooking,
          reward_points: rewardData?.points || 0,
          reward_tier: rewardData?.tier || 'Bronze',
        };
      }));

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (customerId: string) => {
    setDetailLoading(true);
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      // Fetch recent bookings with details
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          total_price_pence,
          status,
          created_at,
          time_slots!inner (
            slot_date,
            slot_time
          ),
          vehicles!inner (
            make,
            model,
            registration
          )
        `)
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch customer vehicles
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      // Transform the bookings data to match our interface
      const transformedBookings = (bookings || []).map(booking => ({
        ...booking,
        time_slots: Array.isArray(booking.time_slots) ? booking.time_slots[0] : booking.time_slots,
        vehicles: Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles,
      }));

      setSelectedCustomer({
        ...customer,
        recent_bookings: transformedBookings,
        vehicles: vehicles || [],
      });
    } catch (error) {
      console.error('Error fetching customer details:', error);
      setError('Failed to load customer details');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState>Loading customers...</LoadingState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-[#9146FF]" />
        <div>
          <h1 className="text-2xl font-bold text-[#F2F2F2]">Customer Management</h1>
          <p className="text-[#C7C7C7]">View and manage customer profiles and booking history</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#F2F2F2]">All Customers ({filteredCustomers.length})</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" onClick={fetchCustomers}>
                  Refresh
                </Button>
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-[#C7C7C7]">No customers found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <div 
                    key={customer.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id 
                        ? 'border-[#9146FF] bg-[#262626]' 
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                    onClick={() => fetchCustomerDetail(customer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#262626] rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-[#9146FF]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-[#F2F2F2]">{customer.full_name}</h3>
                            <p className="text-sm text-[#C7C7C7]">{customer.email}</p>
                            {customer.phone && (
                              <p className="text-xs text-[#8B8B8B]">{customer.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-[#8B8B8B]">Bookings</p>
                            <p className="font-medium text-[#F2F2F2]">{customer.bookings_count}</p>
                          </div>
                          <div>
                            <p className="text-[#8B8B8B]">Vehicles</p>
                            <p className="font-medium text-[#F2F2F2]">{customer.vehicles_count}</p>
                          </div>
                          <div>
                            <p className="text-[#8B8B8B]">Total Spent</p>
                            <p className="font-medium text-[#F2F2F2]">{formatCurrency(customer.total_spent_pence / 100)}</p>
                          </div>
                          <div>
                            <p className="text-[#8B8B8B]">Tier</p>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              customer.reward_tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                              customer.reward_tier === 'Silver' ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {customer.reward_tier}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Customer Details */}
        <div>
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">Customer Details</h2>
            
            {detailLoading ? (
              <LoadingState>Loading details...</LoadingState>
            ) : selectedCustomer ? (
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-medium text-[#F2F2F2] mb-3">{selectedCustomer.full_name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-[#C7C7C7]">{selectedCustomer.email}</span>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-[#C7C7C7]">{selectedCustomer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      <span className="text-[#C7C7C7]">Joined {formatDate(selectedCustomer.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-[#262626] rounded-lg">
                    <p className="text-lg font-semibold text-[#F2F2F2]">{selectedCustomer.bookings_count}</p>
                    <p className="text-xs text-[#8B8B8B]">Bookings</p>
                  </div>
                  <div className="text-center p-3 bg-[#262626] rounded-lg">
                    <p className="text-lg font-semibold text-[#F2F2F2]">{formatCurrency(selectedCustomer.total_spent_pence / 100)}</p>
                    <p className="text-xs text-[#8B8B8B]">Total Spent</p>
                  </div>
                </div>

                {/* Recent Bookings */}
                <div>
                  <h4 className="font-medium text-[#F2F2F2] mb-3">Recent Bookings</h4>
                  {selectedCustomer.recent_bookings.length === 0 ? (
                    <p className="text-sm text-[#8B8B8B]">No bookings yet</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomer.recent_bookings.slice(0, 3).map((booking) => (
                        <div key={booking.id} className="p-3 bg-[#262626] rounded-lg text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-[#F2F2F2]">{booking.booking_reference}</p>
                              <p className="text-[#C7C7C7]">{booking.vehicles.make} {booking.vehicles.model}</p>
                              <p className="text-xs text-[#8B8B8B]">
                                {formatDate(booking.time_slots.slot_date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-[#F2F2F2]">{formatCurrency(booking.total_price_pence / 100)}</p>
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Vehicles */}
                <div>
                  <h4 className="font-medium text-[#F2F2F2] mb-3">Vehicles</h4>
                  {selectedCustomer.vehicles.length === 0 ? (
                    <p className="text-sm text-[#8B8B8B]">No vehicles registered</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomer.vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="flex items-center gap-3 p-3 bg-[#262626] rounded-lg">
                          <Car className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#F2F2F2]">{vehicle.make} {vehicle.model}</p>
                            <p className="text-xs text-[#8B8B8B]">{vehicle.registration} • {vehicle.year}</p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-[#1E1E1E] text-[#C7C7C7] rounded border border-gray-800">
                            {vehicle.size_category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Link href={`/admin/bookings?customer=${selectedCustomer.id}`}>
                    <Button variant="outline" className="w-full">
                      View All Bookings
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-[#C7C7C7]">Select a customer to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}