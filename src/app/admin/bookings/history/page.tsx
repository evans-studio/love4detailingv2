'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Car,
  Phone,
  MapPin,
  DollarSign,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

interface BookingHistoryItem {
  id: string
  booking_reference: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service_name: string
  vehicle_make: string
  vehicle_model: string
  vehicle_reg: string
  service_location: string
  status: string
  total_price_pence: number
  created_at: string
  completed_at?: string
  cancelled_at?: string
}

interface BookingStats {
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  pending_bookings: number
  total_revenue_pence: number
  avg_booking_value_pence: number
}

export default function AdminBookingHistoryPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingHistoryItem[]>([])
  const [stats, setStats] = useState<BookingStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('30d')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<BookingHistoryItem | null>(null)
  const itemsPerPage = 20

  useEffect(() => {
    if (user?.id) {
      fetchBookingHistory()
    }
  }, [user?.id, dateRange])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, statusFilter])

  const fetchBookingHistory = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/bookings/history?admin_id=${user.id}&range=${dateRange}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking history')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch booking history')
      }

      setBookings(result.bookings || [])
      setStats(result.stats || null)

    } catch (error) {
      console.error('Error fetching booking history:', error)
      setError(error instanceof Error ? error.message : 'Failed to load booking history')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.vehicle_reg.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    setFilteredBookings(filtered)
    setCurrentPage(1)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchBookingHistory()
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Pending' },
      confirmed: { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Confirmed' },
      in_progress: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'In Progress' },
      completed: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'Completed' },
      cancelled: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Cancelled' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.color} border`}>{config.label}</Badge>
  }

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (isLoading) {
    return (
      <AdminLayout title="Booking History" subtitle="Loading historical booking data...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Booking History" subtitle="Historical booking data and analytics">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-gray-800/40 border border-purple-500/20 rounded-md text-white text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:text-white hover:border-white/40">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{stats.total_bookings}</p>
                <p className="text-xs text-white/60">Total Bookings</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{stats.completed_bookings}</p>
                <p className="text-xs text-white/60">Completed</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{formatPrice(stats.total_revenue_pence)}</p>
                <p className="text-xs text-white/60">Total Revenue</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{formatPrice(stats.avg_booking_value_pence)}</p>
                <p className="text-xs text-white/60">Avg. Value</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking History Table */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Booking History</CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedBookings.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookings found</p>
                <p className="text-sm mt-2">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 bg-gray-700/30 border border-purple-500/10 rounded-lg hover:bg-gray-700/50 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Booking Info */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{booking.booking_reference}</p>
                            <p className="text-white/60 text-xs">{formatDate(booking.created_at)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{booking.customer_name}</p>
                            <p className="text-white/60 text-xs">{booking.customer_email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{booking.vehicle_make} {booking.vehicle_model}</p>
                            <p className="text-white/60 text-xs">{booking.vehicle_reg}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{formatPrice(booking.total_price_pence)}</p>
                            <p className="text-white/60 text-xs">{booking.service_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 md:col-span-2 lg:col-span-1">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">Service Address</p>
                            <p className="text-white/60 text-xs">{booking.service_location}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center space-x-3 lg:w-auto">
                        {getStatusBadge(booking.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBooking(booking)}
                          className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-purple-500/20">
                <p className="text-sm text-white/60">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
                </p>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-white">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedBooking(null)}
            />
            
            {/* Modal */}
            <div className="relative bg-gray-900/95 backdrop-blur-md border border-purple-500/20 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Booking Details</h2>
                    <p className="text-purple-300">{selectedBooking.booking_reference}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBooking(null)}
                    className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
                  >
                    ✕
                  </Button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Status:</span>
                    {getStatusBadge(selectedBooking.status)}
                  </div>

                  {/* Customer Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white/70">Name</label>
                        <p className="text-white">{selectedBooking.customer_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/70">Email</label>
                        <p className="text-white">{selectedBooking.customer_email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/70">Phone</label>
                        <p className="text-white">{selectedBooking.customer_phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Vehicle Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white/70">Vehicle</label>
                        <p className="text-white">{selectedBooking.vehicle_make} {selectedBooking.vehicle_model}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/70">Registration</label>
                        <p className="text-white">{selectedBooking.vehicle_reg || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Service Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white/70">Service</label>
                        <p className="text-white">{selectedBooking.service_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/70">Total Price</label>
                        <p className="text-white font-semibold">{formatPrice(selectedBooking.total_price_pence)}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-white/70">Service Address</label>
                        <p className="text-white">{selectedBooking.service_location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Important Dates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white/70">Created</label>
                        <p className="text-white">{formatDate(selectedBooking.created_at)}</p>
                      </div>
                      {selectedBooking.completed_at && (
                        <div>
                          <label className="text-sm font-medium text-white/70">Completed</label>
                          <p className="text-white">{formatDate(selectedBooking.completed_at)}</p>
                        </div>
                      )}
                      {selectedBooking.cancelled_at && (
                        <div>
                          <label className="text-sm font-medium text-white/70">Cancelled</label>
                          <p className="text-white">{formatDate(selectedBooking.cancelled_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}