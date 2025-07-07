'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Button, 
  Input, 
  Label, 
  Textarea, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Alert, 
  AlertDescription,
  Badge 
} from '@/components/ui'
import { Loader2, Upload, X, Car, Search, AlertCircle } from 'lucide-react'
import BookingWizard from '@/components/booking/BookingWizard'
import { useBookingStore } from '@/stores/bookingStore'
import { VehicleSize } from '@/types/database.types'

interface VehicleFormData {
  registration: string
  make: string
  model: string
  year: number | ''
  color: string
  size: VehicleSize
  photos: File[]
  specialNotes: string
}

export default function BookingVehiclePage() {
  const router = useRouter()
  const { booking, updateVehicleData, calculatePrice } = useBookingStore()
  
  const [formData, setFormData] = useState<VehicleFormData>({
    registration: '',
    make: '',
    model: '',
    year: '',
    color: '',
    size: 'medium',
    photos: [],
    specialNotes: ''
  })
  
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Initialize form with booking data if available
  useEffect(() => {
    if (booking?.vehicleData) {
      setFormData({
        registration: booking.vehicleData.registration || '',
        make: booking.vehicleData.make || '',
        model: booking.vehicleData.model || '',
        year: booking.vehicleData.year || '',
        color: booking.vehicleData.color || '',
        size: booking.vehicleData.size || 'medium',
        photos: booking.vehicleData.photos || [],
        specialNotes: booking.vehicleData.specialNotes || ''
      })
    }
  }, [booking?.vehicleData])

  // Calculate price when vehicle size changes
  useEffect(() => {
    if (booking?.serviceId && formData.size) {
      const updatePrice = async () => {
        try {
          updateVehicleData({ 
            ...formData,
            year: formData.year === '' ? undefined : formData.year
          })
          const price = await calculatePrice()
          setEstimatedPrice(price / 100) // Convert from pence to pounds
        } catch (error) {
          console.error('Failed to calculate price:', error)
        }
      }
      updatePrice()
    }
  }, [formData.size, booking?.serviceId, calculatePrice, updateVehicleData])

  const handleInputChange = (field: keyof VehicleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: removed, ...rest } = prev
        return rest
      })
    }
  }

  const handleRegistrationLookup = async () => {
    if (!formData.registration) {
      setLookupError('Please enter a registration number')
      return
    }

    try {
      setIsLookingUp(true)
      setLookupError(null)

      // In a real app, this would call DVLA API or similar
      // For now, we'll simulate a lookup with some common UK vehicles
      const mockVehicleData = simulateVehicleLookup(formData.registration)
      
      if (mockVehicleData) {
        setFormData(prev => ({
          ...prev,
          make: mockVehicleData.make,
          model: mockVehicleData.model,
          year: mockVehicleData.year,
          color: mockVehicleData.color,
          size: mockVehicleData.size
        }))
      } else {
        setLookupError('Vehicle not found. Please enter details manually.')
      }

    } catch (error) {
      setLookupError('Failed to lookup vehicle. Please enter details manually.')
    } finally {
      setIsLookingUp(false)
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newPhotos = Array.from(files).slice(0, 4 - formData.photos.length)
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }))
    }
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.registration.trim()) {
      errors.registration = 'Registration is required'
    }
    
    if (!formData.make.trim()) {
      errors.make = 'Make is required'
    }
    
    if (!formData.model.trim()) {
      errors.model = 'Model is required'
    }
    
    if (!formData.year || formData.year < 1950 || formData.year > new Date().getFullYear() + 1) {
      errors.year = 'Please enter a valid year'
    }
    
    if (!formData.color.trim()) {
      errors.color = 'Color is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleContinue = () => {
    if (!validateForm()) {
      return
    }

    // Update booking store with vehicle data
    updateVehicleData({
      ...formData,
      year: formData.year === '' ? undefined : formData.year
    })
    
    router.push('/booking/schedule')
  }

  // Redirect if no service selected
  if (!booking?.serviceId) {
    router.push('/booking/services')
    return null
  }

  return (
    <BookingWizard currentStep="vehicle">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Vehicle Details</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Help us provide the best service by telling us about your vehicle. Photos help our team prepare the right equipment.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Registration Lookup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Vehicle Lookup
                </CardTitle>
                <CardDescription>
                  Enter your registration number to automatically fill vehicle details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="e.g. AB12 CDE"
                      value={formData.registration}
                      onChange={(e) => handleInputChange('registration', e.target.value.toUpperCase())}
                      className="text-center font-mono text-lg"
                    />
                    {validationErrors.registration && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.registration}</p>
                    )}
                  </div>
                  <Button 
                    onClick={handleRegistrationLookup}
                    disabled={isLookingUp || !formData.registration}
                    variant="outline"
                  >
                    {isLookingUp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Lookup'
                    )}
                  </Button>
                </div>

                {lookupError && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{lookupError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Manual Entry */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
                <CardDescription>
                  Complete or correct the vehicle details below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      placeholder="e.g. BMW"
                      value={formData.make}
                      onChange={(e) => handleInputChange('make', e.target.value)}
                    />
                    {validationErrors.make && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.make}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      placeholder="e.g. 3 Series"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                    />
                    {validationErrors.model && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.model}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      placeholder="e.g. 2020"
                      min="1950"
                      max={new Date().getFullYear() + 1}
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', parseInt(e.target.value) || '')}
                    />
                    {validationErrors.year && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.year}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="color">Color *</Label>
                    <Input
                      id="color"
                      placeholder="e.g. Black"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                    />
                    {validationErrors.color && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.color}</p>
                    )}
                  </div>
                </div>

                {/* Vehicle Size */}
                <div>
                  <Label>Vehicle Size *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {[
                      { value: 'small' as VehicleSize, label: 'Small' },
                      { value: 'medium' as VehicleSize, label: 'Medium' },
                      { value: 'large' as VehicleSize, label: 'Large' },
                      { value: 'extra_large' as VehicleSize, label: 'Extra Large' }
                    ].map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => handleInputChange('size', size.value)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.size === size.value
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{size.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special Notes */}
                <div>
                  <Label htmlFor="notes">Special Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requirements, existing damage, or access instructions..."
                    value={formData.specialNotes}
                    onChange={(e) => handleInputChange('specialNotes', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Photos (Optional)</CardTitle>
                <CardDescription>
                  Upload up to 4 photos to help our team prepare. Photos of any existing damage are especially helpful.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formData.photos.length < 4 && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600 mb-2">Upload vehicle photos</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload">
                        <Button variant="outline" size="sm" asChild>
                          <span>Choose Photos</span>
                        </Button>
                      </label>
                    </div>
                  )}

                  {/* Photo Preview */}
                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Vehicle photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.registration && (
                  <div>
                    <Label className="text-sm font-medium">Registration</Label>
                    <p className="font-mono text-lg">{formData.registration}</p>
                  </div>
                )}

                {formData.make && formData.model && (
                  <div>
                    <Label className="text-sm font-medium">Vehicle</Label>
                    <p>{formData.year} {formData.make} {formData.model}</p>
                    {formData.color && <p className="text-sm text-gray-600">{formData.color}</p>}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Size Category</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {formData.size.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {estimatedPrice && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium">Estimated Price</Label>
                    <p className="text-2xl font-bold text-purple-600">£{estimatedPrice}</p>
                    <p className="text-sm text-gray-600">Final price confirmed at booking</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => router.push('/booking/services')}
          >
            Back to Services
          </Button>
          
          <Button 
            onClick={handleContinue}
            size="lg"
            disabled={!formData.registration || !formData.make || !formData.model}
          >
            Continue to Schedule
          </Button>
        </div>
      </div>
    </BookingWizard>
  )
}

// Mock vehicle lookup function (replace with real DVLA API)
function simulateVehicleLookup(registration: string) {
  const mockData: Record<string, any> = {
    'AB12CDE': {
      make: 'BMW',
      model: '3 Series',
      year: 2020,
      color: 'Black',
      size: 'large' as VehicleSize
    },
    'XY98ZAB': {
      make: 'Ford',
      model: 'Focus',
      year: 2019,
      color: 'Blue',
      size: 'medium' as VehicleSize
    }
  }
  
  return mockData[registration.replace(/\s/g, '')]
}