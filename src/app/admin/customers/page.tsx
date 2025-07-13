'use client'

/**
 * Admin Customers Management - Complete oversight of all customers
 * Allows administrators to view, edit, and manage all customers in the system
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  Plus,
  Calendar,
  DollarSign,
  Filter,
  Download,
  RefreshCw,
  Car,
  Mail,
  Phone,
  UserCheck,
  Crown,
  Star,
  Trophy,
  AlertCircle,
  Clock,
  X,
  MapPin,
  Activity,
  CreditCard,
  Gift
} from 'lucide-react'
import Link from 'next/link'

interface Customer {
  id: string
  full_name: string
  email: string
  phone?: string
  role: 'user' | 'admin'
  email_verified: boolean
  created_at: string
  last_sign_in_at?: string
  // Statistics
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  total_spent_pence: number
  avg_booking_value_pence: number
  last_booking_date?: string
  first_booking_date?: string
  vehicle_count: number
  reward_points: number
  reward_tier: 'bronze' | 'silver' | 'gold'
  // Status
  is_active: boolean
  last_activity_date?: string
}

interface CustomerStats {
  total_customers: number
  active_customers: number
  verified_customers: number
  total_bookings: number
  total_revenue_pence: number
  avg_customer_value_pence: number
  top_tier_customers: number
}

export default function AdminCustomersPage() {
  const { profile, permissions, isLoading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerDetails, setCustomerDetails] = useState<any>(null)
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false)
  const [showBookingsModal, setShowBookingsModal] = useState(false)
  const [customerBookings, setCustomerBookings] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    if (profile && permissions?.can_view_analytics) {
      fetchCustomersData()
    }
  }, [profile, permissions])

  useEffect(() => {
    filterCustomers()
  }, [searchTerm, tierFilter, statusFilter, customers])

  const fetchCustomersData = async () => {
    try {
      setIsLoadingData(true)
      const response = await fetch('/api/admin/customers')
      if (response.ok) {
        const { data } = await response.json()
        setCustomers(data.customers || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching customers data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(customer => customer.reward_tier === tierFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(customer => customer.is_active)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(customer => !customer.is_active)
      } else if (statusFilter === 'verified') {
        filtered = filtered.filter(customer => customer.email_verified)
      } else if (statusFilter === 'unverified') {
        filtered = filtered.filter(customer => !customer.email_verified)
      }
    }

    setFilteredCustomers(filtered)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchCustomersData()
    setRefreshing(false)
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-500/20 text-amber-300 border-amber-400/30'
      case 'silver': return 'bg-white/15 text-white border-white/30'
      case 'gold': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
      default: return 'bg-white/15 text-white border-white/30'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return Trophy
      case 'silver': return Star
      case 'gold': return Crown
      default: return Trophy
    }
  }

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getActivityStatus = (lastActivity?: string) => {
    if (!lastActivity) return 'Never'
    
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSince === 0) return 'Today'
    if (daysSince === 1) return 'Yesterday'
    if (daysSince < 7) return `${daysSince} days ago`
    if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`
    return `${Math.floor(daysSince / 30)} months ago`
  }

  // Customer action handlers
  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setLoadingCustomerDetails(true)
    setShowCustomerModal(true)
    
    try {
      console.log('Fetching customer details for:', customer.id)
      const response = await fetch(`/api/admin/customers/${customer.id}`)
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('API Response:', result)
        
        if (result.success && result.data) {
          setCustomerDetails(result.data)
          console.log('Customer details set:', result.data)
        } else {
          console.error('API returned error:', result.error || 'Unknown error')
          alert(`Failed to load customer details: ${result.error || 'Unknown error'}`)
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch customer details. Status:', response.status, 'Error:', errorText)
        
        let errorMessage = `Failed to load customer details. Status: ${response.status}`
        if (response.status === 404) {
          errorMessage = 'Customer not found'
        } else if (response.status === 403) {
          errorMessage = 'Insufficient permissions to view customer details'
        } else if (response.status === 500) {
          errorMessage = 'Server error - please try again or contact support'
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error fetching customer details:', error)
      alert(`Error fetching customer details: ${error}`)
    } finally {
      setLoadingCustomerDetails(false)
    }
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowEditModal(true)
  }

  const handleManageBookings = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setLoadingBookings(true)
    setShowBookingsModal(true)
    
    try {
      console.log('Fetching bookings for customer:', customer.id)
      const response = await fetch(`/api/admin/bookings?search=${encodeURIComponent(customer.email)}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Bookings API Response:', result)
        
        if (result.data && result.data.bookings) {
          // Filter bookings for this specific customer
          const customerBookings = result.data.bookings.filter((booking: any) => 
            booking.customer_email === customer.email || booking.user_id === customer.id
          )
          setCustomerBookings(customerBookings)
          console.log('Customer bookings filtered:', customerBookings)
        } else {
          console.error('No bookings data in response')
          setCustomerBookings([])
        }
      } else {
        console.error('Failed to fetch bookings. Status:', response.status)
        alert('Failed to load customer bookings')
        setCustomerBookings([])
      }
    } catch (error) {
      console.error('Error fetching customer bookings:', error)
      alert(`Error fetching bookings: ${error}`)
      setCustomerBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        // Refresh the bookings list
        if (selectedCustomer) {
          handleManageBookings(selectedCustomer)
        }
        alert('Booking status updated successfully')
      } else {
        alert('Failed to update booking status')
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('Error updating booking status')
    }
  }

  const handleEmailCustomer = (customer: Customer) => {
    // Open default email client with customer's email
    const subject = encodeURIComponent(`Love4Detailing - Customer Service`)
    const body = encodeURIComponent(`Dear ${customer.full_name},\n\n`)
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`)
  }

  const closeCustomerModal = () => {
    setShowCustomerModal(false)
    setSelectedCustomer(null)
    setCustomerDetails(null)
  }

  const closeBookingsModal = () => {
    setShowBookingsModal(false)
    setSelectedCustomer(null)
    setCustomerBookings([])
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingCustomer(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!profile || !permissions?.can_view_analytics) {
    return (
      <AdminLayout title="Access Denied" subtitle="Insufficient permissions">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access customer management.
            </CardDescription>
          </CardHeader>
        </Card>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Customer Management" subtitle="Manage all customers and their relationships">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Email All
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {isLoadingData ? '...' : (stats?.total_customers || 0)}
              </div>
              <p className="text-xs text-white/60">
                {stats?.active_customers || 0} active, {stats?.verified_customers || 0} verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingData ? '...' : (stats?.total_bookings || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingData ? '...' : formatPrice(stats?.total_revenue_pence || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatPrice(stats?.avg_customer_value_pence || 0)} per customer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium Customers</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingData ? '...' : (stats?.top_tier_customers || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Gold tier customers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="all">All Tiers</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
            <CardDescription>
              All customers in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="space-y-4">
                {filteredCustomers.map((customer) => {
                  const TierIcon = getTierIcon(customer.reward_tier)
                  return (
                    <Card key={customer.id} className="p-4">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getTierBadgeColor(customer.reward_tier)}`}
                            >
                              <TierIcon className="h-3 w-3 mr-1" />
                              {customer.reward_tier}
                            </Badge>
                            <Badge variant={customer.is_active ? "default" : "secondary"}>
                              {customer.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant={customer.email_verified ? "default" : "outline"}>
                              {customer.email_verified ? "Verified" : "Unverified"}
                            </Badge>
                            {customer.role === 'admin' && (
                              <Badge variant="outline" className="text-xs text-purple-600">
                                Admin
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {customer.full_name}
                              </h3>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {customer.email}
                              </p>
                              {customer.phone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {customer.phone}
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Member since: {formatDate(customer.created_at)}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Last activity: {getActivityStatus(customer.last_activity_date)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {customer.reward_points} reward points
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-4">
                          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-3">
                            <div>
                              <p className="text-sm font-medium">Bookings</p>
                              <p className="text-lg font-bold text-primary">
                                {customer.total_bookings}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {customer.completed_bookings} completed
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium">Total Spent</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatPrice(customer.total_spent_pence)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Avg: {formatPrice(customer.avg_booking_value_pence)}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium">Vehicles</p>
                              <p className="text-lg font-bold text-blue-600">
                                {customer.vehicle_count}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Registered cars
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium">Last Booking</p>
                              <p className="text-sm font-bold">
                                {customer.last_booking_date 
                                  ? formatDate(customer.last_booking_date)
                                  : 'Never'
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewCustomer(customer)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleManageBookings(customer)}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Manage Bookings
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEmailCustomer(customer)}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Email
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted" />
                <p className="text-lg font-medium">No customers found</p>
                <p className="text-sm">
                  {searchTerm || tierFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No customers have registered yet'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Detail Modal */}
        {showCustomerModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <Card className="bg-background">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Customer Details
                      </CardTitle>
                      <CardDescription>
                        Complete profile for {selectedCustomer.full_name}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={closeCustomerModal}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCustomerDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : customerDetails ? (
                    <div className="space-y-6">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getTierBadgeColor(selectedCustomer.reward_tier)}
                              >
                                {React.createElement(getTierIcon(selectedCustomer.reward_tier), { className: "h-3 w-3 mr-1" })}
                                {selectedCustomer.reward_tier.toUpperCase()}
                              </Badge>
                              <Badge variant={selectedCustomer.is_active ? "default" : "secondary"}>
                                {selectedCustomer.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p><strong>Name:</strong> {selectedCustomer.full_name}</p>
                            <p className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <strong>Email:</strong> {selectedCustomer.email}
                            </p>
                            {selectedCustomer.phone && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                <strong>Phone:</strong> {selectedCustomer.phone}
                              </p>
                            )}
                            <p><strong>Member since:</strong> {formatDate(selectedCustomer.created_at)}</p>
                            <p><strong>Last activity:</strong> {getActivityStatus(selectedCustomer.last_activity_date)}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-3">Account Statistics</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-primary">{selectedCustomer.total_bookings}</p>
                              <p className="text-sm text-muted-foreground">Total Bookings</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{formatPrice(selectedCustomer.total_spent_pence)}</p>
                              <p className="text-sm text-muted-foreground">Total Spent</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">{selectedCustomer.vehicle_count}</p>
                              <p className="text-sm text-muted-foreground">Vehicles</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">{selectedCustomer.reward_points}</p>
                              <p className="text-sm text-muted-foreground">Reward Points</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Data from API */}
                      {customerDetails.booking_history && customerDetails.booking_history.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Recent Bookings</h3>
                          <div className="space-y-2">
                            {customerDetails.booking_history.slice(0, 5).map((booking: any) => (
                              <div key={booking.booking_id} className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
                                <div>
                                  <p className="font-medium">{booking.service_name}</p>
                                  <p className="text-sm text-white/70">{formatDate(booking.slot_date)}</p>
                                  {booking.vehicle_registration && (
                                    <p className="text-xs text-white/70">Vehicle: {booking.vehicle_registration}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                                    {booking.status}
                                  </Badge>
                                  <p className="text-sm font-medium">{formatPrice(booking.total_price_pence)}</p>
                                  <p className="text-xs text-white/70">Ref: {booking.booking_reference}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vehicles */}
                      {customerDetails.vehicles && customerDetails.vehicles.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Registered Vehicles</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customerDetails.vehicles.map((vehicle: any) => (
                              <div key={vehicle.vehicle_id} className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Car className="h-4 w-4" />
                                  <p className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                </div>
                                <p className="text-sm text-white/70">
                                  <strong>Registration:</strong> {vehicle.registration}
                                </p>
                                {vehicle.color && (
                                  <p className="text-sm text-white/70">
                                    <strong>Color:</strong> {vehicle.color}
                                  </p>
                                )}
                                <p className="text-sm text-white/70">
                                  <strong>Size:</strong> {vehicle.size}
                                </p>
                                {vehicle.last_service_date && (
                                  <p className="text-xs text-white/70">
                                    Last service: {formatDate(vehicle.last_service_date)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Statistics from API */}
                      {customerDetails.statistics && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Detailed Statistics</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-center">
                              <p className="text-lg font-bold text-green-400">{customerDetails.statistics.total_bookings || 0}</p>
                              <p className="text-sm text-white/70">Total Bookings</p>
                            </div>
                            <div className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-center">
                              <p className="text-lg font-bold text-blue-400">{customerDetails.statistics.completed_bookings || 0}</p>
                              <p className="text-sm text-white/70">Completed</p>
                            </div>
                            <div className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-center">
                              <p className="text-lg font-bold text-primary">{formatPrice(customerDetails.statistics.total_spent_pence || 0)}</p>
                              <p className="text-sm text-white/70">Total Spent</p>
                            </div>
                            <div className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-center">
                              <p className="text-lg font-bold text-orange-400">{formatPrice(customerDetails.statistics.average_booking_value_pence || 0)}</p>
                              <p className="text-sm text-white/70">Avg Booking</p>
                            </div>
                          </div>
                          {customerDetails.statistics.first_booking_date && (
                            <div className="mt-4 text-sm text-white/70">
                              <p><strong>First booking:</strong> {formatDate(customerDetails.statistics.first_booking_date)}</p>
                              <p><strong>Customer for:</strong> {Math.round(customerDetails.statistics.customer_lifetime_months || 0)} months</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin Notes */}
                      {customerDetails.admin_notes && customerDetails.admin_notes.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Admin Notes</h3>
                          <div className="space-y-2">
                            {customerDetails.admin_notes.slice(0, 3).map((note: any) => (
                              <div key={note.note_id} className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium text-sm">{note.title}</p>
                                  <p className="text-xs text-white/70">{formatDate(note.created_at)}</p>
                                </div>
                                <p className="text-sm text-white/70">{note.content}</p>
                                <p className="text-xs text-white/70 mt-1">By: {note.admin_name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                      <p>Failed to load customer details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Bookings Management Modal */}
        {showBookingsModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <Card className="bg-background">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Manage Bookings
                      </CardTitle>
                      <CardDescription>
                        Bookings for {selectedCustomer.full_name}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={closeBookingsModal}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingBookings ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : customerBookings.length > 0 ? (
                    <div className="space-y-4">
                      {customerBookings.map((booking: any) => (
                        <Card key={booking.booking_id} className="p-4">
                          <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant={booking.booking_status === 'completed' ? 'default' : 
                                          booking.booking_status === 'cancelled' ? 'destructive' : 
                                          booking.booking_status === 'confirmed' ? 'secondary' : 'outline'}
                                >
                                  {booking.booking_status}
                                </Badge>
                                <Badge variant="outline">
                                  {booking.payment_status || 'pending'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {booking.service_name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Ref: {booking.booking_reference}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Vehicle: {booking.vehicle_display_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Registration: {booking.vehicle_registration}
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Date: {booking.appointment_date ? formatDate(booking.appointment_date) : 'TBD'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Time: {booking.appointment_time || 'TBD'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Duration: {booking.service_duration || 120} minutes
                                  </p>
                                  <p className="text-sm font-medium">
                                    Price: {formatPrice(booking.total_price_pence)}
                                  </p>
                                </div>
                              </div>
                              
                              {booking.special_instructions && (
                                <div className="mt-2">
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Instructions:</strong> {booking.special_instructions}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-4">
                              <div className="space-y-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUpdateBookingStatus(booking.booking_id, 'confirmed')}
                                  disabled={booking.booking_status === 'completed' || booking.booking_status === 'cancelled'}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Confirm
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUpdateBookingStatus(booking.booking_id, 'completed')}
                                  disabled={booking.booking_status === 'completed' || booking.booking_status === 'cancelled'}
                                >
                                  <Activity className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUpdateBookingStatus(booking.booking_id, 'cancelled')}
                                  disabled={booking.booking_status === 'completed' || booking.booking_status === 'cancelled'}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg font-medium">No bookings found</p>
                      <p className="text-sm">This customer has no bookings yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditModal && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <Card className="bg-background">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Edit Customer
                      </CardTitle>
                      <CardDescription>
                        Edit details for {editingCustomer.full_name}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={closeEditModal}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Full Name</label>
                      <Input value={editingCustomer.full_name} readOnly className="bg-muted" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <Input value={editingCustomer.email} readOnly className="bg-muted" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Phone</label>
                      <Input value={editingCustomer.phone || ''} readOnly className="bg-muted" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <div className="flex items-center gap-2">
                        <Badge variant={editingCustomer.is_active ? "default" : "secondary"}>
                          {editingCustomer.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant={editingCustomer.email_verified ? "default" : "outline"}>
                          {editingCustomer.email_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Reward Tier</label>
                      <Badge 
                        variant="outline" 
                        className={getTierBadgeColor(editingCustomer.reward_tier)}
                      >
                        {React.createElement(getTierIcon(editingCustomer.reward_tier), { className: "h-3 w-3 mr-1" })}
                        {editingCustomer.reward_tier.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                      <p className="font-medium mb-2">Note:</p>
                      <p>Customer profile editing is currently view-only. For security reasons, customer data modifications should be done through the customer's own account or through direct database operations.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}