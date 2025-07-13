'use client'

import { useState, useEffect } from 'react'
import { useVehicles } from '@/hooks/useVehicles'
import { VehicleCard } from '@/components/vehicles/VehicleCard'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorAlert, InfoAlert } from '@/components/ui/BrandedAlert'
import { Badge } from '@/components/ui/badge'
import EnhancedCustomerDashboardLayout from '@/components/dashboard/EnhancedCustomerDashboardLayout'
import { 
  Car, 
  Plus, 
  Search, 
  Filter,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'

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
}

// VehicleForm expects a different format
interface VehicleFormData {
  id?: string
  registration: string
  make: string
  model: string
  year: number
  color?: string
  size?: 'small' | 'medium' | 'large' | 'extra_large'
  vehicle_type?: string
  special_requirements?: string
  notes?: string
}

// Convert database Vehicle to VehicleForm format
const convertToFormData = (vehicle: Vehicle | null): VehicleFormData | undefined => {
  if (!vehicle) return undefined
  
  const sizeMap: Record<string, 'small' | 'medium' | 'large' | 'extra_large'> = {
    'S': 'small',
    'M': 'medium', 
    'L': 'large',
    'XL': 'extra_large'
  }
  
  return {
    id: vehicle.id,
    registration: vehicle.registration,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    size: sizeMap[vehicle.size] || 'medium'
  }
}

export default function VehiclesPage() {
  const { vehicles, isLoading, error, retryCount, lastError, deleteVehicle, refetch } = useVehicles()
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const handleAddVehicle = () => {
    setEditingVehicle(null)
    setShowForm(true)
  }

  const handleQuickAddVehicle = (makeModel: string) => {
    const [make, model] = makeModel.split(' ', 2)
    // Create a minimal vehicle for the form
    const quickVehicle: Partial<Vehicle> = {
      id: '',
      registration: '',
      make: make,
      model: model,
      year: new Date().getFullYear(),
      color: '',
      size: 'M'
    }
    setEditingVehicle(quickVehicle as Vehicle)
    setShowForm(true)
  }

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setShowForm(true)
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    const registrationText = vehicle ? ` (${vehicle.registration})` : ''
    
    if (!confirm(`Are you sure you want to delete this vehicle${registrationText}? This action cannot be undone.`)) {
      return
    }

    setDeletingId(vehicleId)
    try {
      const { error } = await deleteVehicle(vehicleId)
      if (error) {
        // Create a more user-friendly error message
        let userMessage = error
        if (error.includes('existing bookings')) {
          userMessage = `Cannot delete vehicle${registrationText} because it has existing bookings. Please cancel or complete all bookings first.`
        } else if (error.includes('not found')) {
          userMessage = `Vehicle${registrationText} has already been deleted.`
        } else if (error.includes('permission')) {
          userMessage = `You don't have permission to delete this vehicle.`
        }
        
        alert(`Failed to delete vehicle: ${userMessage}`)
      }
    } catch (error) {
      alert(`Failed to delete vehicle${registrationText}. Please try again.`)
    } finally {
      setDeletingId(null)
    }
  }

  const handlePhotoManage = (vehicleId: string) => {
    // TODO: Implement photo management modal
    alert('Photo management coming soon!')
  }

  const handleFormSuccess = async () => {
    setShowForm(false)
    setEditingVehicle(null)
    // Force refresh to ensure the new vehicle appears immediately
    await refetch()
    
    // Show success message for first vehicle
    if (vehicles.length === 0) {
      // This will show the success message when vehicles.length becomes 1
      setTimeout(() => {
        const successMessage = document.createElement('div')
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
        successMessage.textContent = '🎉 Great! Your first vehicle has been added successfully!'
        document.body.appendChild(successMessage)
        setTimeout(() => {
          successMessage.remove()
        }, 4000)
      }, 500)
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingVehicle(null)
  }

  if (showForm) {
    return (
      <EnhancedCustomerDashboardLayout title="My Vehicles" subtitle="Manage your vehicle information">
        <VehicleForm
          vehicle={convertToFormData(editingVehicle)}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </EnhancedCustomerDashboardLayout>
    )
  }

  return (
    <EnhancedCustomerDashboardLayout title="My Vehicles" subtitle="Manage your vehicle information">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Vehicles</h1>
            <p className="text-muted-foreground">
              Manage your vehicles and service history
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Connection status indicator */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-blue-600" title="Connected to API - Use refresh button to see latest changes">
                <RefreshCw className="h-4 w-4 mr-1" />
                <span className="text-sm">Connected</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleAddVehicle}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>
        {/* Error State */}
        {error && (
          <ErrorAlert title="Connection Error" dismissible className="mb-6">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <div className="flex items-center gap-2">
                {retryCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Retry {retryCount}/3
                  </Badge>
                )}
                {!error.includes('Retrying') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </ErrorAlert>
        )}

        {/* Developer Error Info (only in development) */}
        {lastError && process.env.NODE_ENV === 'development' && (
          <InfoAlert title="Debug Info" className="mb-6">
            <div className="text-sm">
              <strong>Error Type:</strong> {lastError.type} - {lastError.message}
              <div className="text-xs mt-1 opacity-70">
                {new Date(lastError.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </InfoAlert>
        )}



        {/* Loading State */}
        {isLoading && !vehicles.length && (
          <div className="text-center py-12">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <div className="text-muted-foreground">Loading your vehicles...</div>
          </div>
        )}

        {/* Smart Empty State with Auto-Initialization */}
        {!isLoading && vehicles.length === 0 && !error && (
          <div className="space-y-8">
            {/* Welcome Message */}
            <Card className="text-center py-12">
              <CardHeader>
                <Car className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                <CardTitle className="text-2xl">Welcome to Your Vehicle Garage</CardTitle>
                <CardDescription className="max-w-2xl mx-auto text-base">
                  Let's get you started! Add your vehicles to speed up future bookings, 
                  track service history, and get accurate pricing based on vehicle size.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleAddVehicle}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Vehicle
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowOnboarding(true)}
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Quick Setup
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Initialization Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Popular Vehicles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Car className="h-5 w-5 mr-2 text-blue-500" />
                    Popular Vehicles
                  </CardTitle>
                  <CardDescription>
                    Quick add common UK vehicles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['Ford Focus', 'Vauxhall Corsa', 'BMW 3 Series'].map((vehicle) => (
                      <Button
                        key={vehicle}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start hover:bg-purple-50 hover:text-purple-600"
                        onClick={() => handleQuickAddVehicle(vehicle)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {vehicle}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-green-500" />
                    Benefits
                  </CardTitle>
                  <CardDescription>
                    Why add your vehicles?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-2"></div>
                      Faster booking process
                    </li>
                    <li className="flex items-start">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-2"></div>
                      Automatic size detection
                    </li>
                    <li className="flex items-start">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-2"></div>
                      Service history tracking
                    </li>
                    <li className="flex items-start">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-2"></div>
                      Accurate pricing
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Getting Started */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2 text-purple-500" />
                    Getting Started
                  </CardTitle>
                  <CardDescription>
                    Simple 3-step process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="bg-purple-100 text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                      Add vehicle details
                    </li>
                    <li className="flex items-start">
                      <span className="bg-purple-100 text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                      Auto-detect size
                    </li>
                    <li className="flex items-start">
                      <span className="bg-purple-100 text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                      Start booking!
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Smart Onboarding Modal */}
        {showOnboarding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                  <div className="flex items-center">
                    <Car className="h-6 w-6 mr-2 text-purple-500" />
                    Quick Vehicle Setup
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOnboarding(false)}
                  >
                    ×
                  </Button>
                </CardTitle>
                <CardDescription>
                  Let's quickly set up your first vehicle with smart suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Popular UK Vehicles */}
                  <div>
                    <h3 className="font-semibold mb-3">Popular UK Vehicles</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        'Ford Focus', 'Vauxhall Corsa', 'BMW 3 Series',
                        'Audi A4', 'Volkswagen Golf', 'Mercedes C-Class'
                      ].map((vehicle) => (
                        <Button
                          key={vehicle}
                          variant="outline"
                          className="justify-start hover:bg-purple-50 hover:border-purple-300"
                          onClick={() => {
                            handleQuickAddVehicle(vehicle)
                            setShowOnboarding(false)
                          }}
                        >
                          <Car className="h-4 w-4 mr-2" />
                          {vehicle}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Size Guide */}
                  <div>
                    <h3 className="font-semibold mb-3">Vehicle Size Guide</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="font-medium text-blue-800">Small (S)</div>
                        <div className="text-blue-600">Mini, Polo, Corsa</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded border border-green-200">
                        <div className="font-medium text-green-800">Medium (M)</div>
                        <div className="text-green-600">Focus, Golf, A3</div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded border border-orange-200">
                        <div className="font-medium text-orange-800">Large (L)</div>
                        <div className="text-orange-600">5 Series, E-Class</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded border border-red-200">
                        <div className="font-medium text-red-800">Extra Large (XL)</div>
                        <div className="text-red-600">X5, Range Rover</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        handleAddVehicle()
                        setShowOnboarding(false)
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      Add Custom Vehicle
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowOnboarding(false)}
                      className="flex-1"
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vehicle Grid */}
        {vehicles.length > 0 && (
          <>
            {/* Smart Progress Indicator for New Users */}
            {vehicles.length === 1 && (
              <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                        ✓
                      </div>
                      <div>
                        <div className="font-semibold text-purple-700">Great start! You've added your first vehicle.</div>
                        <div className="text-sm text-purple-600">Consider adding other vehicles you regularly use for complete coverage.</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddVehicle}
                      className="border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{vehicles.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <div className="h-4 w-4 text-muted-foreground">📅</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vehicles.reduce((sum, v) => sum + (v.booking_count || 0), 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <div className="h-4 w-4 text-muted-foreground">£</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    £{(vehicles.reduce((sum: number, v: any) => sum + (v.total_spent_pence || 0), 0) / 100).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vehicles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="relative">
                  <VehicleCard
                    vehicle={vehicle}
                    usage={{ 
                      total_bookings: (vehicle as any).booking_count || 0,
                      completed_bookings: (vehicle as any).completed_bookings || 0,
                      total_spent_pence: (vehicle as any).total_spent_pence || 0,
                      last_service_date: (vehicle as any).last_service_date || undefined,
                      next_recommended_service: undefined
                    }}
                    onEdit={handleEditVehicle}
                    onDelete={handleDeleteVehicle}
                    onPhotoManage={handlePhotoManage}
                  />
                  
                  {/* Delete Loading Overlay */}
                  {deletingId === vehicle.id && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                        <div className="text-sm text-muted-foreground">Deleting...</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </EnhancedCustomerDashboardLayout>
  )
}