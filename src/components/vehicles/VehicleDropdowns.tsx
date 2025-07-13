'use client'

import { useState, useEffect, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/Badge'
import vehicleData from '@/data/vehicle-size-data.json'

interface VehicleDataEntry {
  make: string
  model: string
  trim?: string
  size: string
}

interface VehicleDropdownsProps {
  selectedMake: string
  selectedModel: string
  onMakeChange: (make: string) => void
  onModelChange: (model: string) => void
  onSizeDetected: (size: string) => void
  disabled?: boolean
}

// Size mapping from JSON to database format
const sizeMapping = {
  'S': 'small',
  'M': 'medium',
  'L': 'large',
  'XL': 'extra_large'
} as const

const SIZE_COLORS = {
  small: 'bg-l4d-info/10 text-l4d-info border-l4d-info/20',
  medium: 'bg-l4d-success/10 text-l4d-success border-l4d-success/20',
  large: 'bg-l4d-warning/10 text-l4d-warning border-l4d-warning/20',
  extra_large: 'bg-destructive/10 text-destructive border-destructive/20'
}

const SIZE_LABELS = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'Extra Large'
}

export function VehicleDropdowns({ 
  selectedMake, 
  selectedModel, 
  onMakeChange, 
  onModelChange, 
  onSizeDetected,
  disabled = false 
}: VehicleDropdownsProps) {
  const [detectedSize, setDetectedSize] = useState<string | null>(null)

  // Get unique makes from vehicle data
  const makes = Array.from(new Set((vehicleData as VehicleDataEntry[]).map(v => v.make))).sort()

  // Get models for selected make
  const models = selectedMake 
    ? Array.from(new Set((vehicleData as VehicleDataEntry[])
        .filter(v => v.make === selectedMake)
        .map(v => v.model)
      )).sort()
    : []

  // Detect size when both make and model are selected
  useEffect(() => {
    if (selectedMake && selectedModel) {
      const vehicle = (vehicleData as VehicleDataEntry[]).find(v => 
        v.make === selectedMake && v.model === selectedModel
      )
      
      if (vehicle) {
        const databaseSize = sizeMapping[vehicle.size as keyof typeof sizeMapping] || 'medium'
        setDetectedSize(databaseSize)
        onSizeDetected(databaseSize)
      } else {
        setDetectedSize('medium') // Default fallback
        onSizeDetected('medium')
      }
    } else {
      setDetectedSize(null)
    }
  }, [selectedMake, selectedModel]) // EMERGENCY: Keep dependencies minimal

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMake = e.target.value
    onMakeChange(newMake)
    
    // Reset model when make changes
    if (selectedModel) {
      onModelChange('')
    }
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onModelChange(e.target.value)
  }

  return (
    <div className="space-y-4">
      {/* Make and Model Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="make">
            Make <span className="text-red-500">*</span>
          </Label>
          <select
            id="make"
            value={selectedMake}
            onChange={handleMakeChange}
            disabled={disabled}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a make...</option>
            {makes.map(make => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">
            Model <span className="text-red-500">*</span>
          </Label>
          <select
            id="model"
            value={selectedModel}
            onChange={handleModelChange}
            disabled={disabled || !selectedMake}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {selectedMake ? 'Select a model...' : 'Select make first'}
            </option>
            {models.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Instant Size Detection Display */}
      {detectedSize && selectedMake && selectedModel && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">Detected Vehicle Size</h4>
              <p className="text-sm text-muted-foreground">
                Size automatically detected from our database
              </p>
            </div>
            <Badge variant="secondary" className={SIZE_COLORS[detectedSize as keyof typeof SIZE_COLORS]}>
              {SIZE_LABELS[detectedSize as keyof typeof SIZE_LABELS]}
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}