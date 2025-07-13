'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Car, User, CheckCircle, AlertCircle, Search, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { VehicleDropdowns } from '@/components/vehicles/VehicleDropdowns'

interface Customer {
  id: string
  email: string
  phone?: string
  full_name: string
  booking_count: number
  last_sign_in_at?: string
  is_existing_customer: boolean
}

interface Vehicle {
  id: string
  registration: string
  make: string
  model: string
  year: number
  color: string | null
  size: string
  size_confirmed: boolean
  base_price_pence: number
  formatted_price: string
  display_name: string
  vehicle_description: string
}

export default function CreateBookingPage() {
  const { user } = useAuth()
  
  // Customer selection state
  const [customerMode, setCustomerMode] = useState<'new' | 'existing'>('new')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Vehicle selection state
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(true)

  // Vehicle size detection state for dropdowns
  const [detectedSize, setDetectedSize] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Customer details
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    
    // Vehicle details
    vehicleRegistration: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: new Date().getFullYear(),
    vehicleColor: '',
    vehicleSize: 'medium',
    
    // Service details
    serviceDate: '',
    serviceTime: '',
    serviceAddress: '',
    servicePostcode: '',
    specialInstructions: '',
    
    // Booking details
    paymentMethod: 'cash',
    status: 'confirmed'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Customer search functionality
  const searchCustomers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(query)}&admin_id=${user?.id}&limit=5`)
      
      if (response.ok) {
        const result = await response.json()
        setSearchResults(result.customers || [])
      } else {
        console.error('Customer search failed:', response.statusText)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Customer search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input with debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchCustomers(value)
    }, 300)
  }

  // Fetch customer vehicles
  const fetchCustomerVehicles = async (customerId: string) => {
    setIsLoadingVehicles(true)
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/vehicles?admin_id=${user?.id}`)
      
      if (response.ok) {
        const result = await response.json()
        setCustomerVehicles(result.vehicles || [])
        
        // Auto-select first vehicle if only one exists
        if (result.vehicles && result.vehicles.length === 1) {
          selectVehicle(result.vehicles[0])
        } else if (result.vehicles && result.vehicles.length === 0) {
          // No vehicles, show vehicle form
          setShowVehicleForm(true)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch customer vehicles:', response.statusText, errorData)
        setCustomerVehicles([])
        setShowVehicleForm(true)
      }
    } catch (error) {
      console.error('Error fetching customer vehicles:', error)
      setCustomerVehicles([])
      setShowVehicleForm(true)
    } finally {
      setIsLoadingVehicles(false)
    }
  }

  // Select existing customer
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({
      ...prev,
      customerName: customer.full_name,
      customerEmail: customer.email,
      customerPhone: customer.phone || ''
    }))
    setSearchQuery('')
    setSearchResults([])
    
    // Fetch customer vehicles
    fetchCustomerVehicles(customer.id)
  }

  // Select vehicle and auto-fill form
  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setFormData(prev => ({
      ...prev,
      vehicleRegistration: vehicle.registration,
      vehicleMake: vehicle.make,
      vehicleModel: vehicle.model,
      vehicleYear: vehicle.year,
      vehicleColor: vehicle.color || '',
      vehicleSize: vehicle.size
    }))
    setShowVehicleForm(false)
  }

  // Clear vehicle selection
  const clearVehicleSelection = () => {
    setSelectedVehicle(null)
    setDetectedSize(null)
    setFormData(prev => ({
      ...prev,
      vehicleRegistration: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: new Date().getFullYear(),
      vehicleColor: '',
      vehicleSize: 'medium'
    }))
    setShowVehicleForm(true)
  }

  // Clear customer selection
  const clearCustomerSelection = () => {
    setSelectedCustomer(null)
    setCustomerVehicles([])
    setSelectedVehicle(null)
    setDetectedSize(null)
    setShowVehicleForm(true)
    setFormData(prev => ({
      ...prev,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      vehicleRegistration: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: new Date().getFullYear(),
      vehicleColor: '',
      vehicleSize: 'medium'
    }))
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Vehicle dropdown handlers
  const handleMakeChange = (make: string) => {
    setFormData(prev => ({
      ...prev,
      vehicleMake: make
    }))
  }

  const handleModelChange = (model: string) => {
    setFormData(prev => ({
      ...prev,
      vehicleModel: model
    }))
  }

  const handleSizeDetected = (size: string) => {
    setDetectedSize(size)
    setFormData(prev => ({
      ...prev,
      vehicleSize: size
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!user?.id) {
      setError('Admin user not found')
      setIsSubmitting(false)
      return
    }

    try {
      const bookingData = {
        admin_id: user.id,
        customer_data: {
          full_name: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone
        },
        vehicle_data: {
          registration: formData.vehicleRegistration,
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          year: formData.vehicleYear,
          color: formData.vehicleColor,
          size: formData.vehicleSize
        },
        service_data: {
          date: formData.serviceDate,
          time: formData.serviceTime,
          address: formData.serviceAddress,
          postcode: formData.servicePostcode,
          special_instructions: formData.specialInstructions
        },
        booking_settings: {
          payment_method: formData.paymentMethod,
          status: formData.status
        },
        is_existing_customer: customerMode === 'existing' && selectedCustomer !== null,
        existing_customer_id: selectedCustomer?.id || null,
        existing_vehicle_id: selectedVehicle?.id || null,
        use_existing_vehicle: selectedVehicle !== null
      }

      const response = await fetch('/api/admin/bookings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      const result = await response.json()
      
      if (result.success) {
        setSuccess(true)
        setSuccessMessage(result.message)
        
        // Reset form after success
        setTimeout(() => {
          setFormData({
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            vehicleRegistration: '',
            vehicleMake: '',
            vehicleModel: '',
            vehicleYear: new Date().getFullYear(),
            vehicleColor: '',
            vehicleSize: 'medium',
            serviceDate: '',
            serviceTime: '',
            serviceAddress: '',
            servicePostcode: '',
            specialInstructions: '',
            paymentMethod: 'cash',
            status: 'confirmed'
          })
          setSelectedCustomer(null)
          setCustomerVehicles([])
          setSelectedVehicle(null)
          setDetectedSize(null)
          setShowVehicleForm(true)
          setCustomerMode('new')
          setSuccess(false)
          setSuccessMessage('')
        }, 5000)
      } else {
        throw new Error(result.error || 'Failed to create booking')
      }
      
    } catch (err) {
      console.error('Booking creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateForm = () => {
    return formData.customerName &&
           formData.customerEmail &&
           formData.customerPhone &&
           formData.vehicleRegistration &&
           formData.vehicleMake &&
           formData.vehicleModel &&
           formData.serviceDate &&
           formData.serviceTime &&
           formData.serviceAddress
  }

  if (success) {
    return (
      <AdminLayout title="Create Booking" subtitle="Add a new booking manually">
        <div className="max-w-md mx-auto mt-12 text-center">
          <Card className="bg-green-500/10 border-green-400/30">
            <CardContent className="pt-6">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Booking Created Successfully!</h2>
              <p className="text-white/70 mb-4">
                {successMessage || 'The booking has been created and the customer will be notified.'}
              </p>
              <div className="space-y-2">
                <Link href="/admin/bookings">
                  <Button className="w-full">
                    View All Bookings
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setSuccess(false)}
                >
                  Create Another Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Create Booking" subtitle="Add a new booking manually">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/bookings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Booking</h1>
            <p className="text-muted-foreground">Manually create a booking for a customer</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Mode Selection */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="newCustomer"
                    name="customerMode"
                    checked={customerMode === 'new'}
                    onChange={() => {
                      setCustomerMode('new')
                      clearCustomerSelection()
                    }}
                    className="w-4 h-4 text-purple-600"
                  />
                  <Label htmlFor="newCustomer" className="flex items-center gap-2 cursor-pointer">
                    <UserPlus className="h-4 w-4" />
                    New Customer
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="existingCustomer"
                    name="customerMode"
                    checked={customerMode === 'existing'}
                    onChange={() => setCustomerMode('existing')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <Label htmlFor="existingCustomer" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    Existing Customer
                  </Label>
                </div>
              </div>

              {/* Existing Customer Search */}
              {customerMode === 'existing' && !selectedCustomer && (
                <div className="space-y-3">
                  <Label htmlFor="customerSearch">Search Existing Customers</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="customerSearch"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search by name, email, or phone..."
                      className="pl-9"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                      {searchResults.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="p-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {customer.full_name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {customer.email}
                              </p>
                              {customer.phone && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {customer.phone}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {customer.booking_count} bookings
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-3">
                      No customers found matching "{searchQuery}"
                    </p>
                  )}
                </div>
              )}

              {/* Selected Customer Display */}
              {selectedCustomer && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100">
                        Selected Customer
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {selectedCustomer.full_name} • {selectedCustomer.email}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {selectedCustomer.booking_count} previous bookings
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearCustomerSelection}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}

              {/* Customer Form Fields */}
              {(customerMode === 'new' || !selectedCustomer) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Full Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                        placeholder="John Smith"
                        required
                        disabled={selectedCustomer !== null}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email Address *</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        placeholder="john@example.com"
                        required
                        disabled={selectedCustomer !== null}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerPhone">Phone Number *</Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        placeholder="07123456789"
                        required
                        disabled={selectedCustomer !== null}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* New Customer Notice */}
              {customerMode === 'new' && formData.customerEmail && (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    This will create a new customer account. They'll receive an email with instructions to set up their password and access their dashboard.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vehicle Selection for Existing Customers */}
              {customerMode === 'existing' && selectedCustomer && (
                <div className="space-y-4">
                  {isLoadingVehicles ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading vehicles...</span>
                    </div>
                  ) : customerVehicles.length > 0 ? (
                    <div>
                      <Label>Select Vehicle</Label>
                      <div className="grid gap-3 mt-2">
                        {customerVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            onClick={() => selectVehicle(vehicle)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-purple-400 ${
                              selectedVehicle?.id === vehicle.id
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {vehicle.display_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {vehicle.vehicle_description}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Size: {vehicle.size} • {vehicle.formatted_price}
                                </p>
                              </div>
                              {selectedVehicle?.id === vehicle.id && (
                                <CheckCircle className="h-5 w-5 text-purple-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {selectedVehicle && (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearVehicleSelection}
                          >
                            Add Different Vehicle
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        No vehicles found for this customer. Please add vehicle details below.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Vehicle Form Fields */}
              {(customerMode === 'new' || showVehicleForm) && (
                <>
                  <div>
                    <Label htmlFor="vehicleRegistration">Registration *</Label>
                    <Input
                      id="vehicleRegistration"
                      value={formData.vehicleRegistration}
                      onChange={(e) => handleInputChange('vehicleRegistration', e.target.value.toUpperCase())}
                      placeholder="AB12 CDE"
                      className="uppercase"
                      required
                    />
                  </div>

                  {/* Smart Vehicle Dropdowns */}
                  <VehicleDropdowns
                    selectedMake={formData.vehicleMake}
                    selectedModel={formData.vehicleModel}
                    onMakeChange={handleMakeChange}
                    onModelChange={handleModelChange}
                    onSizeDetected={handleSizeDetected}
                    disabled={false}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vehicleYear">Year</Label>
                      <Input
                        id="vehicleYear"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        value={formData.vehicleYear}
                        onChange={(e) => handleInputChange('vehicleYear', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehicleColor">Color</Label>
                      <Input
                        id="vehicleColor"
                        value={formData.vehicleColor}
                        onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
                        placeholder="Black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="vehicleSize">Vehicle Size</Label>
                    <div className="space-y-2">
                      <select
                        id="vehicleSize"
                        value={formData.vehicleSize}
                        onChange={(e) => handleInputChange('vehicleSize', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="small">Small (£50.00)</option>
                        <option value="medium">Medium (£75.00)</option>
                        <option value="large">Large (£100.00)</option>
                        <option value="extra_large">Extra Large (£125.00)</option>
                      </select>
                      {detectedSize && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Size automatically detected from make/model. You can change if needed.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Selected Vehicle Display */}
              {selectedVehicle && !showVehicleForm && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100">
                        Selected Vehicle
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {selectedVehicle.display_name}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {selectedVehicle.vehicle_description} • Size: {selectedVehicle.size} • {selectedVehicle.formatted_price}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVehicleForm(true)}
                    >
                      Edit Details
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceDate">Service Date *</Label>
                  <Input
                    id="serviceDate"
                    type="date"
                    value={formData.serviceDate}
                    onChange={(e) => handleInputChange('serviceDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="serviceTime">Service Time *</Label>
                  <Input
                    id="serviceTime"
                    type="time"
                    value={formData.serviceTime}
                    onChange={(e) => handleInputChange('serviceTime', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="serviceAddress">Service Address *</Label>
                  <Input
                    id="serviceAddress"
                    value={formData.serviceAddress}
                    onChange={(e) => handleInputChange('serviceAddress', e.target.value)}
                    placeholder="123 Main Street, London"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="servicePostcode">Postcode</Label>
                  <Input
                    id="servicePostcode"
                    value={formData.servicePostcode}
                    onChange={(e) => handleInputChange('servicePostcode', e.target.value.toUpperCase())}
                    placeholder="SW1A 1AA"
                    className="uppercase"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Input
                  id="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  placeholder="Ring doorbell, park in driveway, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* Booking Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Initial Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={!validateForm() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                      Creating Booking...
                    </>
                  ) : (
                    'Create Booking'
                  )}
                </Button>
                <Link href="/admin/bookings">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AdminLayout>
  )
}