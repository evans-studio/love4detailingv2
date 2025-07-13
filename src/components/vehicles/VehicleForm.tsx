'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Loader2, Car } from 'lucide-react'
import { useVehicles } from '@/hooks/useVehicles'
import { VehicleDropdowns } from './VehicleDropdowns'

interface Vehicle {
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

interface VehicleFormProps {
  vehicle?: Vehicle
  onSuccess: () => void
  onCancel: () => void
  onDataChange?: (data: Vehicle) => void // For booking flow context
}


export function VehicleForm({ vehicle, onSuccess, onCancel, onDataChange }: VehicleFormProps) {
  const { createVehicle, updateVehicle } = useVehicles()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedSize, setDetectedSize] = useState<string | null>(null)

  const [formData, setFormData] = useState<Vehicle>({
    registration: vehicle?.registration || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    color: vehicle?.color || '',
    vehicle_type: vehicle?.vehicle_type || 'car',
    special_requirements: vehicle?.special_requirements || '',
    notes: vehicle?.notes || '',
  })

  const isEditing = !!vehicle?.id

  const handleInputChange = (field: keyof Vehicle, value: string | number) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    setError(null)
    
    // Call onDataChange for booking flow context
    if (onDataChange) {
      onDataChange(newData)
    }
  }

  const handleMakeChange = useCallback((make: string) => {
    const newData = { ...formData, make }
    setFormData(newData)
    setError(null)
    
    // Call onDataChange for booking flow context
    if (onDataChange) {
      onDataChange(newData)
    }
  }, [formData, onDataChange])

  const handleModelChange = useCallback((model: string) => {
    const newData = { ...formData, model }
    setFormData(newData)
    setError(null)
    
    // Call onDataChange for booking flow context
    if (onDataChange) {
      onDataChange(newData)
    }
  }, [formData, onDataChange])

  const handleSizeDetected = useCallback((size: string) => {
    setDetectedSize(size)
    const newData = { ...formData, size: size as any }
    setFormData(newData)
    
    // Call onDataChange for booking flow context
    if (onDataChange) {
      onDataChange(newData)
    }
  }, [formData, onDataChange])

  const validateForm = (): string | null => {
    if (!formData.registration.trim()) return 'Registration is required'
    if (!formData.make.trim()) return 'Make is required'
    if (!formData.model.trim()) return 'Model is required'
    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      return 'Please enter a valid year'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    try {
      const vehicleData = {
        ...formData,
        registration: formData.registration.toUpperCase().trim(),
        make: formData.make.trim(),
        model: formData.model.trim(),
      }

      let result
      if (isEditing) {
        result = await updateVehicle(vehicle.id!, vehicleData)
      } else {
        result = await createVehicle(vehicleData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update your vehicle information' 
            : 'Add a vehicle to your garage for faster bookings'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Registration */}
          <div className="space-y-2">
            <Label htmlFor="registration">
              Registration Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="registration"
              type="text"
              placeholder="e.g. AB12 CDE"
              value={formData.registration}
              onChange={(e) => handleInputChange('registration', e.target.value.toUpperCase())}
              required
              disabled={isLoading}
              className="uppercase"
            />
          </div>

          {/* Make and Model Dropdowns */}
          <VehicleDropdowns
            selectedMake={formData.make}
            selectedModel={formData.model}
            onMakeChange={handleMakeChange}
            onModelChange={handleModelChange}
            onSizeDetected={handleSizeDetected}
            disabled={isLoading}
          />

          {/* Year and Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="text"
                placeholder="e.g. Black"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>


          {/* Special Requirements */}
          <div className="space-y-2">
            <Label htmlFor="special_requirements">Special Requirements</Label>
            <Input
              id="special_requirements"
              type="text"
              placeholder="e.g. Low suspension, ceramic coating"
              value={formData.special_requirements}
              onChange={(e) => handleInputChange('special_requirements', e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Any additional notes about this vehicle"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>

        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            <>
              {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}