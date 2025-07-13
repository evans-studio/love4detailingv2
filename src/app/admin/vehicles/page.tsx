'use client'

/**
 * Admin Vehicles Management - Complete oversight of all customer vehicles
 * Allows administrators to view, edit, and manage all vehicles in the system
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Car, 
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
  UserCheck,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Vehicle {
  id: string
  user_id: string
  registration: string
  make: string
  model: string
  year: number
  color?: string
  size: 'S' | 'M' | 'L' | 'XL'
  size_confirmed?: boolean
  booking_count?: number
  completed_bookings?: number
  total_spent_pence?: number
  last_service_date?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Customer info
  customer_name?: string
  customer_email?: string
  customer_phone?: string
}

interface VehicleStats {
  total_vehicles: number
  active_vehicles: number
  total_bookings: number
  total_revenue_pence: number
  most_popular_size: string
  average_bookings_per_vehicle: number
}

export default function AdminVehiclesPage() {
  const { profile, permissions, isLoading } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [stats, setStats] = useState<VehicleStats | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sizeFilter, setSizeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (profile && permissions?.can_view_analytics) {
      fetchVehiclesData()
    }
  }, [profile, permissions])

  useEffect(() => {
    filterVehicles()
  }, [searchTerm, sizeFilter, statusFilter, vehicles])

  const fetchVehiclesData = async () => {
    try {
      setIsLoadingData(true)
      const response = await fetch('/api/admin/vehicles')
      if (response.ok) {
        const { data } = await response.json()
        setVehicles(data.vehicles || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching vehicles data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const filterVehicles = () => {
    let filtered = vehicles

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vehicle => 
        vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Size filter
    if (sizeFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.size === sizeFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(vehicle => vehicle.is_active)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(vehicle => !vehicle.is_active)
      }
    }

    setFilteredVehicles(filtered)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchVehiclesData()
    setRefreshing(false)
  }

  const getSizeBadgeColor = (size: string) => {
    switch (size) {
      case 'S': return 'bg-green-100 text-green-800 border-green-200'
      case 'M': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'L': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'XL': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
        <Card className="w-full max-w-md mx-auto bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-white/60">
              You don't have permission to access vehicle management.
            </CardDescription>
          </CardHeader>
        </Card>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Vehicle Management" subtitle="Manage all customer vehicles and fleet data">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">Vehicle Management</h1>
          <p className="text-muted-foreground">Manage all customer vehicles in the system</p>
        </div>
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
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingData ? '...' : (stats?.total_vehicles || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.active_vehicles || 0} active
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
                Avg: {stats?.average_bookings_per_vehicle.toFixed(1) || '0.0'} per vehicle
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
                From vehicle bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Popular Size</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingData ? '...' : (stats?.most_popular_size || 'M')}
              </div>
              <p className="text-xs text-muted-foreground">
                Vehicle size category
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
                    placeholder="Search vehicles, customers, or registrations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="all">All Sizes</option>
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicles ({filteredVehicles.length})</CardTitle>
            <CardDescription>
              All customer vehicles in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredVehicles.length > 0 ? (
              <div className="space-y-4">
                {filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getSizeBadgeColor(vehicle.size)}`}
                          >
                            {vehicle.size}
                          </Badge>
                          <Badge variant={vehicle.is_active ? "default" : "secondary"}>
                            {vehicle.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {!vehicle.size_confirmed && (
                            <Badge variant="outline" className="text-xs text-yellow-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Size Unconfirmed
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {vehicle.registration}
                            </h3>
                            <p className="text-muted-foreground">
                              {vehicle.make} {vehicle.model} ({vehicle.year})
                            </p>
                            {vehicle.color && (
                              <p className="text-sm text-muted-foreground">
                                Color: {vehicle.color}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              {vehicle.customer_name || 'Unknown Customer'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.customer_email}
                            </p>
                            {vehicle.customer_phone && (
                              <p className="text-sm text-muted-foreground">
                                {vehicle.customer_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-4">
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-2">
                          <div>
                            <p className="text-sm font-medium">Bookings</p>
                            <p className="text-lg font-bold text-primary">
                              {vehicle.booking_count || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {vehicle.completed_bookings || 0} completed
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Total Spent</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatPrice(vehicle.total_spent_pence || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last: {vehicle.last_service_date 
                                ? formatDate(vehicle.last_service_date)
                                : 'Never'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-4 text-muted" />
                <p className="text-lg font-medium">No vehicles found</p>
                <p className="text-sm">
                  {searchTerm || sizeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No vehicles have been registered yet'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}