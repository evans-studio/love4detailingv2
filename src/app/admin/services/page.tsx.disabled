'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { 
  Plus, 
  Search, 
  Edit3, 
  Eye, 
  Power, 
  PowerOff, 
  Trash2, 
  Copy, 
  MoreVertical, 
  Settings,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Star,
  Sparkles,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ServicePricing {
  id: string
  vehicle_size: string
  price_pence: number
  duration_minutes: number
  is_active: boolean
}

interface ServiceData {
  id: string
  name: string
  code: string
  description: string
  short_description: string
  base_duration_minutes: number
  display_order: number
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  pricing: ServicePricing[]
  pricing_summary: {
    range: { min: number; max: number }
    formatted_range: string
    vehicle_sizes: string[]
    total_pricing_records: number
    active_pricing_records: number
  }
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  // Fetch services
  const fetchServices = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/services')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch services')
      }

      setServices(result.data || [])
    } catch (err) {
      console.error('Error fetching services:', err)
      setError(err instanceof Error ? err.message : 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  // Toggle service active status
  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      setActionLoading(serviceId)

      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active' })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update service status')
      }

      // Update local state
      setServices(services.map(service => 
        service.id === serviceId 
          ? { ...service, is_active: !currentStatus }
          : service
      ))

    } catch (err) {
      console.error('Error toggling service status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update service')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter services based on search
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.short_description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <AdminLayout title="Service Management" subtitle="Loading service catalog...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/70">Loading service catalog...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Service Management" subtitle="Manage services, pricing, and availability">
      <div className="p-4 lg:p-6 space-y-6">
      {/* Header with Love4Detailing Branding */}
      <div className="relative">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)] rounded-2xl" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 backdrop-blur-sm">
                <Settings className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Service Management
                </h1>
              </div>
            </div>
            <p className="text-white/70 text-lg ml-15">
              Transform your service catalog with Love4Detailing's professional management system
            </p>
            <div className="flex items-center gap-4 mt-3 ml-15">
              <div className="flex items-center gap-1 text-sm text-purple-300">
                <Sparkles className="h-4 w-4" />
                <span>Premium Services</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-purple-300">
                <Zap className="h-4 w-4" />
                <span>Dynamic Pricing</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-purple-300">
                <Star className="h-4 w-4" />
                <span>Professional Quality</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => router.push('/admin/services/create')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Service
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search services by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>{filteredServices.length} of {services.length} services</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-red-300">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto border-red-500/50 text-red-300 hover:bg-red-600/10"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <Card className="relative bg-white/5 backdrop-blur-md border-white/10 rounded-xl overflow-hidden">
          {/* Premium Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-purple-800/5" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700" />
          
          <CardContent className="relative p-12 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 backdrop-blur-sm mx-auto mb-6">
              <Settings className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-3">
              {searchTerm ? 'No Services Found' : 'Welcome to Service Management'}
            </h3>
            <p className="text-white/70 text-lg mb-6 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms or create a new service'
                : 'Start building your premium service catalog with Love4Detailing\'s professional tools'
              }
            </p>
            {!searchTerm && (
              <div className="space-y-4">
                <Button
                  onClick={() => router.push('/admin/services/create')}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:scale-105 px-8 py-3 text-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Service
                </Button>
                <div className="flex items-center justify-center gap-6 text-sm text-purple-300 mt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Premium Quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Dynamic Pricing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span>Professional Tools</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card 
              key={service.id} 
              className="group relative bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 rounded-xl overflow-hidden"
            >
              {/* Premium Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-purple-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Love4Detailing Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg mb-1 flex items-center gap-2">
                      {service.name}
                      {service.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        className={service.is_active 
                          ? "bg-green-500/20 text-green-300 border-green-400/30" 
                          : "bg-red-500/20 text-red-300 border-red-400/30"
                        }
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-white/50 font-mono">{service.code}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-white/70 text-sm line-clamp-2">
                  {service.short_description || service.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pricing Summary */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-white/5 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-white/60">Price Range</span>
                    </div>
                    <p className="text-purple-300 font-semibold">
                      {service.pricing_summary.formatted_range}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-white/60">Duration</span>
                    </div>
                    <p className="text-white/80 font-medium">
                      {service.base_duration_minutes} min
                    </p>
                  </div>
                </div>

                {/* Vehicle Sizes */}
                <div>
                  <p className="text-xs text-white/60 mb-2">Available for:</p>
                  <div className="flex flex-wrap gap-1">
                    {service.pricing_summary.vehicle_sizes.map(size => (
                      <Badge key={size} className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
                        {size.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Features Preview */}
                {service.features && service.features.length > 0 && (
                  <div>
                    <p className="text-xs text-white/60 mb-2">Features ({service.features.length}):</p>
                    <div className="space-y-1">
                      {service.features.slice(0, 2).map((feature, index) => (
                        <p key={index} className="text-xs text-white/70 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                          {feature}
                        </p>
                      ))}
                      {service.features.length > 2 && (
                        <p className="text-xs text-purple-300">
                          +{service.features.length - 2} more features...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/services/${service.id}`)}
                    className="flex-1 border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400/60 transition-all duration-200"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/services/${service.id}/edit`)}
                    className="flex-1 border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleServiceStatus(service.id, service.is_active)}
                    disabled={actionLoading === service.id}
                    className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200"
                  >
                    {actionLoading === service.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : service.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
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