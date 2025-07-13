'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Car, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Search,
  Filter,
  Archive,
  Eye,
  Edit2,
  Download,
  RefreshCw
} from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'

interface UnmatchedVehicle {
  id: string
  make: string
  model: string
  year?: number
  registration?: string
  customer_name?: string
  customer_email?: string
  booking_count: number
  last_booking_date: string
  suggested_size?: string
  confidence_score?: number
  created_at: string
}

export default function UnmatchedVehiclesPage() {
  const [vehicles, setVehicles] = useState<UnmatchedVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'high_priority' | 'low_priority'>('all')
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [processingIds, setProcessingIds] = useState<string[]>([])

  // Load unmatched vehicles
  useEffect(() => {
    loadUnmatchedVehicles()
  }, [])

  const loadUnmatchedVehicles = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, create mock data since the unmatched_vehicles table was removed in cleanup
      // In a real implementation, this would query booking data for vehicles with unknown sizes
      const mockData: UnmatchedVehicle[] = [
        {
          id: '1',
          make: 'Tesla',
          model: 'Cybertruck',
          year: 2024,
          registration: 'CY24 BER',
          customer_name: 'John Smith',
          customer_email: 'john@example.com',
          booking_count: 3,
          last_booking_date: '2025-07-10',
          suggested_size: 'extra_large',
          confidence_score: 85,
          created_at: '2025-07-01T10:00:00Z'
        },
        {
          id: '2',
          make: 'BYD',
          model: 'Atto 3',
          year: 2023,
          registration: 'BY23 ATT',
          customer_name: 'Sarah Wilson',
          customer_email: 'sarah@example.com',
          booking_count: 1,
          last_booking_date: '2025-07-08',
          suggested_size: 'medium',
          confidence_score: 70,
          created_at: '2025-07-08T14:30:00Z'
        },
        {
          id: '3',
          make: 'Polestar',
          model: '2',
          year: 2024,
          customer_name: 'Mike Johnson',
          customer_email: 'mike@example.com',
          booking_count: 2,
          last_booking_date: '2025-07-05',
          suggested_size: 'large',
          confidence_score: 60,
          created_at: '2025-07-05T09:15:00Z'
        }
      ]

      setVehicles(mockData)
    } catch (err) {
      console.error('Error loading unmatched vehicles:', err)
      setError('Failed to load unmatched vehicles')
    } finally {
      setLoading(false)
    }
  }

  // Filter vehicles based on search and status
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = searchTerm === '' || 
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'high_priority' && vehicle.booking_count >= 2) ||
      (filterStatus === 'low_priority' && vehicle.booking_count < 2)

    return matchesSearch && matchesFilter
  })

  // Handle vehicle selection
  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    )
  }

  // Handle bulk operations
  const handleBulkArchive = async () => {
    if (selectedVehicles.length === 0) return

    setProcessingIds(selectedVehicles)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Remove archived vehicles from list
      setVehicles(prev => prev.filter(v => !selectedVehicles.includes(v.id)))
      setSelectedVehicles([])
      
      console.log('Archived vehicles:', selectedVehicles)
    } catch (err) {
      console.error('Error archiving vehicles:', err)
    } finally {
      setProcessingIds([])
    }
  }

  // Handle individual vehicle actions
  const handleResolveVehicle = async (vehicleId: string, suggestedSize: string) => {
    setProcessingIds([vehicleId])
    try {
      // Simulate API call to add vehicle to size registry
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Remove resolved vehicle from list
      setVehicles(prev => prev.filter(v => v.id !== vehicleId))
      
      console.log(`Resolved vehicle ${vehicleId} with size ${suggestedSize}`)
    } catch (err) {
      console.error('Error resolving vehicle:', err)
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== vehicleId))
    }
  }

  // Get priority badge
  const getPriorityBadge = (bookingCount: number, confidenceScore?: number) => {
    if (bookingCount >= 3) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High Priority</Badge>
    } else if (bookingCount >= 2) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium Priority</Badge>
    } else {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Low Priority</Badge>
    }
  }

  // Get confidence badge
  const getConfidenceBadge = (score?: number) => {
    if (!score) return null
    
    if (score >= 80) {
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400">High Confidence</Badge>
    } else if (score >= 60) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">Medium Confidence</Badge>
    } else {
      return <Badge variant="secondary" className="bg-red-500/20 text-red-400">Low Confidence</Badge>
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Unmatched Vehicles" subtitle="Manage vehicles that need size classification">
        <div className="p-4 lg:p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading unmatched vehicles...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Unmatched Vehicles" subtitle="Manage vehicles that need size classification">
      <div className="p-4 lg:p-6 space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white"
            >
              <option value="all">All Vehicles</option>
              <option value="high_priority">High Priority</option>
              <option value="low_priority">Low Priority</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={loadUnmatchedVehicles}
              variant="outline"
              size="sm"
              className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            {selectedVehicles.length > 0 && (
              <Button
                onClick={handleBulkArchive}
                variant="outline"
                size="sm"
                disabled={processingIds.length > 0}
                className="border-red-500/50 text-red-200 hover:bg-red-600/10"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Selected ({selectedVehicles.length})
              </Button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                  <Car className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Unmatched</p>
                  <p className="text-lg font-bold text-white">{vehicles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">High Priority</p>
                  <p className="text-lg font-bold text-white">{vehicles.filter(v => v.booking_count >= 3).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">High Confidence</p>
                  <p className="text-lg font-bold text-white">{vehicles.filter(v => (v.confidence_score || 0) >= 80).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <Filter className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Filtered Results</p>
                  <p className="text-lg font-bold text-white">{filteredVehicles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicles List */}
        {filteredVehicles.length === 0 ? (
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-8 text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Unmatched Vehicles</h3>
              <p className="text-gray-400">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No vehicles match your current filters.'
                  : 'All vehicles have been successfully categorized. Great work!'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="bg-gray-800/40 border-purple-500/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedVehicles.includes(vehicle.id)}
                        onChange={() => toggleVehicleSelection(vehicle.id)}
                        className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-600 bg-gray-700"
                      />

                      {/* Vehicle Icon */}
                      <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                        <Car className="h-6 w-6 text-purple-400" />
                      </div>

                      {/* Vehicle Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {vehicle.year && `${vehicle.year} `}{vehicle.make} {vehicle.model}
                          </h3>
                          {getPriorityBadge(vehicle.booking_count)}
                          {getConfidenceBadge(vehicle.confidence_score)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            {vehicle.registration && (
                              <p className="text-gray-400">
                                <span className="font-medium">Registration:</span> {vehicle.registration}
                              </p>
                            )}
                            {vehicle.customer_name && (
                              <p className="text-gray-400">
                                <span className="font-medium">Customer:</span> {vehicle.customer_name}
                              </p>
                            )}
                            <p className="text-gray-400">
                              <span className="font-medium">Bookings:</span> {vehicle.booking_count}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-400">
                              <span className="font-medium">Last Booking:</span> {new Date(vehicle.last_booking_date).toLocaleDateString()}
                            </p>
                            {vehicle.suggested_size && (
                              <p className="text-gray-400">
                                <span className="font-medium">Suggested Size:</span> 
                                <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-400">
                                  {vehicle.suggested_size}
                                </Badge>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {vehicle.suggested_size && (
                        <Button
                          onClick={() => handleResolveVehicle(vehicle.id, vehicle.suggested_size!)}
                          disabled={processingIds.includes(vehicle.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}