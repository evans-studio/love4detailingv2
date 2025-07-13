'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { 
  ArrowLeft,
  Save,
  X,
  DollarSign,
  Clock,
  Loader2,
  AlertCircle,
  Settings,
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react'

interface ServicePricing {
  id: string
  vehicle_size: string
  price_pence: number
  duration_minutes: number
  is_active: boolean
}

interface ServiceFormData {
  name: string
  code: string
  description: string
  short_description: string
  base_duration_minutes: number
  display_order: number
  features: string[]
  is_active: boolean
  pricing: {
    [key: string]: {
      price_pence: number
      duration_minutes: number
      is_active: boolean
    }
  }
}

const VEHICLE_SIZES = [
  { key: 'small', label: 'Small Vehicles', description: 'Mini Cooper, Ford Fiesta' },
  { key: 'medium', label: 'Medium Vehicles', description: 'Ford Focus, BMW 3 Series' },
  { key: 'large', label: 'Large Vehicles', description: 'BMW X5, Land Rover Discovery' },
  { key: 'extra_large', label: 'Extra Large Vehicles', description: 'Large SUVs, luxury vehicles' }
]

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.serviceId as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newFeature, setNewFeature] = useState('')
  
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    code: '',
    description: '',
    short_description: '',
    base_duration_minutes: 120,
    display_order: 0,
    features: [],
    is_active: true,
    pricing: {}
  })

  // Initialize pricing for all vehicle sizes
  const initializePricing = (existingPricing: ServicePricing[] = []) => {
    const pricing: ServiceFormData['pricing'] = {}
    
    VEHICLE_SIZES.forEach(size => {
      const existing = existingPricing.find(p => p.vehicle_size === size.key)
      pricing[size.key] = {
        price_pence: existing?.price_pence || 5000,
        duration_minutes: existing?.duration_minutes || 120,
        is_active: existing?.is_active !== false
      }
    })
    
    return pricing
  }

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

      const service = result.data
      setFormData({
        name: service.name || '',
        code: service.code || '',
        description: service.description || '',
        short_description: service.short_description || '',
        base_duration_minutes: service.base_duration_minutes || 120,
        display_order: service.display_order || 0,
        features: service.features || [],
        is_active: service.is_active !== false,
        pricing: initializePricing(service.pricing || [])
      })
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

  // Save service
  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Service name is required')
      }
      if (!formData.code.trim()) {
        throw new Error('Service code is required')
      }

      // Transform pricing data
      const pricingArray = Object.entries(formData.pricing).map(([vehicleSize, pricing]) => ({
        vehicle_size: vehicleSize,
        price_pence: pricing.price_pence,
        duration_minutes: pricing.duration_minutes,
        is_active: pricing.is_active
      }))

      const response = await fetch(`/api/admin/services`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: serviceId,
          service: {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim(),
            short_description: formData.short_description.trim(),
            base_duration_minutes: formData.base_duration_minutes,
            display_order: formData.display_order,
            features: formData.features.filter(f => f.trim()),
            is_active: formData.is_active
          },
          pricing: pricingArray
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update service')
      }

      // Navigate back to service detail
      router.push(`/admin/services/${serviceId}`)
    } catch (err) {
      console.error('Error saving service:', err)
      setError(err instanceof Error ? err.message : 'Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  // Add feature
  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }))
      setNewFeature('')
    }
  }

  // Remove feature
  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  // Update pricing
  const updatePricing = (vehicleSize: string, field: string, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [vehicleSize]: {
          ...prev.pricing[vehicleSize],
          [field]: value
        }
      }
    }))
  }

  if (loading) {
    return (
      <AdminLayout title="Edit Service" subtitle="Modify service details and pricing">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/70">Loading service for editing...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Edit Service" subtitle="Modify service details and pricing">
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
                Edit Service
              </h1>
              <p className="text-white/70 mt-1">Modify service details and pricing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-200"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Service Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Full Valet Service"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code" className="text-gray-300">Service Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., FULL_VALET"
                      className="mt-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the service"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="shortDescription" className="text-gray-300">Short Description</Label>
                  <Input
                    id="shortDescription"
                    value={formData.short_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="Brief description for cards and lists"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-gray-300">Base Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.base_duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_duration_minutes: parseInt(e.target.value) || 120 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayOrder" className="text-gray-300">Display Order</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Service Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a new feature..."
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addFeature}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                      <span className="flex-1 text-white/90">{feature}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFeature(index)}
                        className="border-red-500/50 text-red-300 hover:bg-red-600/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {formData.features.length === 0 && (
                    <p className="text-white/50 text-sm">No features added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

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
                  {VEHICLE_SIZES.map((size) => {
                    const pricing = formData.pricing[size.key] || { price_pence: 5000, duration_minutes: 120, is_active: true }
                    return (
                      <div key={size.key} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white">{size.label}</h4>
                            <p className="text-xs text-white/60">{size.description}</p>
                          </div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={pricing.is_active}
                              onChange={(e) => updatePricing(size.key, 'is_active', e.target.checked)}
                              className="rounded border-gray-600 bg-gray-700 text-purple-600"
                            />
                            <span className="text-xs text-white/70">Active</span>
                          </label>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="text-gray-300 text-xs">Price (£)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={(pricing.price_pence / 100).toFixed(2)}
                              onChange={(e) => updatePricing(size.key, 'price_pence', Math.round(parseFloat(e.target.value || '0') * 100))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-xs">Duration (minutes)</Label>
                            <Input
                              type="number"
                              value={pricing.duration_minutes}
                              onChange={(e) => updatePricing(size.key, 'duration_minutes', parseInt(e.target.value) || 120)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Status & Summary */}
          <div className="space-y-6">
            {/* Status */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-purple-600"
                  />
                  <div>
                    <span className="text-white font-medium">Service Active</span>
                    <p className="text-xs text-white/60">
                      {formData.is_active ? 'Service is available for booking' : 'Service is hidden from customers'}
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-white">Current Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Badge 
                    className={formData.is_active 
                      ? "bg-green-500/20 text-green-300 border-green-400/30" 
                      : "bg-red-500/20 text-red-300 border-red-400/30"
                    }
                  >
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Features:</span>
                    <span className="text-white">{formData.features.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Active Sizes:</span>
                    <span className="text-white">
                      {Object.values(formData.pricing).filter(p => p.is_active).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Duration:</span>
                    <span className="text-white">{formData.base_duration_minutes}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}