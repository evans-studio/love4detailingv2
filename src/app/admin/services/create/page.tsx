'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Trash2,
  Star,
  Zap
} from 'lucide-react'

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
  { key: 'small', label: 'Small Vehicles', description: 'Mini Cooper, Ford Fiesta', defaultPrice: 4500 },
  { key: 'medium', label: 'Medium Vehicles', description: 'Ford Focus, BMW 3 Series', defaultPrice: 6000 },
  { key: 'large', label: 'Large Vehicles', description: 'BMW X5, Land Rover Discovery', defaultPrice: 7500 },
  { key: 'extra_large', label: 'Extra Large Vehicles', description: 'Large SUVs, luxury vehicles', defaultPrice: 8500 }
]

export default function CreateServicePage() {
  const router = useRouter()
  
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
    pricing: VEHICLE_SIZES.reduce((acc, size) => {
      acc[size.key] = {
        price_pence: size.defaultPrice,
        duration_minutes: 120,
        is_active: true
      }
      return acc
    }, {} as ServiceFormData['pricing'])
  })

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        throw new Error(result.error || 'Failed to create service')
      }

      // Navigate to the new service
      router.push(`/admin/services/${result.data.service.id}`)
    } catch (err) {
      console.error('Error saving service:', err)
      setError(err instanceof Error ? err.message : 'Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  // Generate code from name
  const generateCode = () => {
    if (formData.name && !formData.code) {
      const code = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20)
      setFormData(prev => ({ ...prev, code }))
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

  // Calculate price range for display
  const getPriceRange = () => {
    const activePrices = Object.values(formData.pricing)
      .filter(p => p.is_active)
      .map(p => p.price_pence)
    
    if (activePrices.length === 0) return 'No active pricing'
    
    const min = Math.min(...activePrices)
    const max = Math.max(...activePrices)
    
    if (min === max) {
      return `£${(min / 100).toFixed(2)}`
    }
    return `£${(min / 100).toFixed(2)} - £${(max / 100).toFixed(2)}`
  }

  return (
    <AdminLayout title="Create Service" subtitle="Add a new service to your catalog">
      <div className="space-y-6 p-6">
        {/* Header with Love4Detailing Branding */}
        <div className="relative">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)] rounded-2xl" />
          
          <div className="relative flex items-center justify-between">
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
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 backdrop-blur-sm">
                    <Plus className="h-6 w-6 text-purple-400" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    Create New Service
                  </h1>
                </div>
                <p className="text-white/70 text-lg ml-15">
                  Build your premium service catalog with Love4Detailing's professional tools
                </p>
                <div className="flex items-center gap-4 mt-3 ml-15">
                  <div className="flex items-center gap-1 text-sm text-purple-300">
                    <Sparkles className="h-4 w-4" />
                    <span>Premium Quality</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-purple-300">
                    <Zap className="h-4 w-4" />
                    <span>Dynamic Pricing</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-purple-300">
                    <Star className="h-4 w-4" />
                    <span>Professional Tools</span>
                  </div>
                </div>
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
                disabled={saving || !formData.name.trim() || !formData.code.trim()}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:scale-105 px-6 py-3 text-lg font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Create Service
                  </>
                )}
              </Button>
            </div>
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
            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Service Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      onBlur={generateCode}
                      placeholder="e.g., Premium Exterior Wash"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code" className="text-gray-300">Service Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., PREMIUM_WASH"
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
                    placeholder="Detailed description of what this service includes"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="shortDescription" className="text-gray-300">Short Description</Label>
                  <Input
                    id="shortDescription"
                    value={formData.short_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="Brief description for service cards"
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
            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700" />
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
                    placeholder="Add a service feature..."
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addFeature}
                    className="bg-purple-600 hover:bg-purple-700 border-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
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
                    <div className="text-center p-6 border border-dashed border-white/20 rounded-lg">
                      <p className="text-white/50">No features added yet</p>
                      <p className="text-white/40 text-sm mt-1">Add features to describe what's included in this service</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Matrix */}
            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-purple-400" />
                  Pricing Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {VEHICLE_SIZES.map((size) => {
                    const pricing = formData.pricing[size.key]
                    return (
                      <div key={size.key} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200">
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
                              className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
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
            {/* Service Preview */}
            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Star className="h-5 w-5 text-purple-400" />
                  Service Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="text-lg font-bold text-purple-300">
                    {getPriceRange()}
                  </div>
                  <div className="text-sm text-white/70">Price Range</div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Service Name:</span>
                    <span className="text-white">{formData.name || 'Not set'}</span>
                  </div>
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

                <div>
                  <Badge 
                    className={formData.is_active 
                      ? "bg-green-500/20 text-green-300 border-green-400/30" 
                      : "bg-red-500/20 text-red-300 border-red-400/30"
                    }
                  >
                    {formData.is_active ? 'Will be Active' : 'Will be Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Status Settings */}
            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Service Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-white font-medium">Make Service Active</span>
                    <p className="text-xs text-white/60">
                      {formData.is_active ? 'Service will be available for booking immediately' : 'Service will be hidden from customers'}
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Save Section */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-900/95 to-black/95 backdrop-blur-sm border-t border-purple-500/20 p-6">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="text-white/70">
              {formData.name ? (
                <span>Creating: <strong className="text-purple-300">{formData.name}</strong></span>
              ) : (
                <span>Fill out the form above to create your service</span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name.trim() || !formData.code.trim()}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:scale-105 px-8 py-3 text-lg font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creating Service...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Create Service Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}