'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { 
  ArrowLeft,
  Edit3, 
  Power, 
  PowerOff, 
  Trash2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Star,
  Sparkles,
  Car,
  MapPin,
  Calendar,
  Settings,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react'

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

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.serviceId as string
  
  const [service, setService] = useState<ServiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch service details
  const fetchService = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/services/${serviceId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch service details')
      }

      setService(result.data)
    } catch (err) {
      console.error('Error fetching service:', err)
      setError(err instanceof Error ? err.message : 'Failed to load service details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (serviceId) {
      fetchService()
    }
  }, [serviceId])

  // Toggle service active status
  const toggleServiceStatus = async () => {
    if (!service) return
    
    try {
      setActionLoading(true)

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
      setService(prev => prev ? { ...prev, is_active: !prev.is_active } : null)

    } catch (err) {
      console.error('Error toggling service status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update service')
    } finally {
      setActionLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AdminLayout title="Service Details" subtitle="View service information and pricing">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/70">Loading service details...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !service) {
    return (
      <AdminLayout title="Service Details" subtitle="View service information and pricing">
        <div className="space-y-6 p-6">
          {/* Error Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">Service Not Found</h1>
          </div>

          {/* Error Card */}
          <Card className="bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-300 mb-2">Service Not Found</h3>
              <p className="text-red-300/80 mb-4">
                {error || 'The requested service could not be found.'}
              </p>
              <Button
                onClick={() => router.push('/admin/services')}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
              >
                Back to Services
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Service Details" subtitle="View service information and pricing">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                {service.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge 
                  className={service.is_active 
                    ? "bg-green-500/20 text-green-300 border-green-400/30" 
                    : "bg-red-500/20 text-red-300 border-red-400/30"
                  }
                >
                  {service.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-sm text-white/50 font-mono">{service.code}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleServiceStatus}
              disabled={actionLoading}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : service.is_active ? (
                <PowerOff className="h-4 w-4 mr-2" />
              ) : (
                <Power className="h-4 w-4 mr-2" />
              )}
              {service.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              onClick={() => router.push(`/admin/services/${serviceId}/edit`)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-200"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Service
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Service Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Service Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/80">Description</label>
                  <p className="text-white/90 mt-1">{service.description}</p>
                </div>
                
                {service.short_description && (
                  <div>
                    <label className="text-sm font-medium text-white/80">Short Description</label>
                    <p className="text-white/90 mt-1">{service.short_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-white/80">Service Code</label>
                    <p className="text-white/90 font-mono mt-1">{service.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white/80">Base Duration</label>
                    <p className="text-white/90 mt-1">{service.base_duration_minutes} minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            {service.features && service.features.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    Service Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-white/90">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Matrix */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-purple-400" />
                  Pricing Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.pricing.map((pricing) => (
                    <div 
                      key={pricing.id}
                      className="p-4 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="capitalize font-medium text-white">
                          {pricing.vehicle_size.replace('_', ' ')} Vehicles
                        </span>
                        <Badge 
                          className={pricing.is_active 
                            ? "bg-green-500/20 text-green-300 border-green-400/30" 
                            : "bg-red-500/20 text-red-300 border-red-400/30"
                          }
                        >
                          {pricing.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Price:</span>
                          <span className="text-purple-300 font-semibold">
                            {formatCurrency(pricing.price_pence)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Duration:</span>
                          <span className="text-white/90">
                            {pricing.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Star className="h-5 w-5 text-purple-400" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-300">
                    {service.pricing_summary.formatted_range}
                  </div>
                  <div className="text-sm text-white/70">Price Range</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-lg font-semibold text-white">
                      {service.pricing_summary.active_pricing_records}
                    </div>
                    <div className="text-xs text-white/70">Active Sizes</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-lg font-semibold text-white">
                      {service.base_duration_minutes}m
                    </div>
                    <div className="text-xs text-white/70">Base Duration</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Available For</label>
                  <div className="flex flex-wrap gap-1">
                    {service.pricing_summary.vehicle_sizes.map(size => (
                      <Badge key={size} className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
                        {size.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  Service Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-white/80">Created</label>
                  <p className="text-white/90 text-sm mt-1">{formatDate(service.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80">Last Updated</label>
                  <p className="text-white/90 text-sm mt-1">{formatDate(service.updated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80">Display Order</label>
                  <p className="text-white/90 text-sm mt-1">{service.display_order}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}