'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Car, 
  Calendar, 
  DollarSign, 
  Camera, 
  Edit, 
  Trash2, 
  MoreVertical,
  MapPin
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
  is_active: boolean
  created_at: string
  updated_at: string
}

interface VehicleUsageStats {
  total_bookings: number
  completed_bookings: number
  total_spent_pence: number
  last_service_date?: string
  next_recommended_service?: string
}

interface VehicleCardProps {
  vehicle: Vehicle
  usage: VehicleUsageStats
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicleId: string) => void
  onPhotoManage: (vehicleId: string) => void
}

const SIZE_COLORS = {
  S: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  M: 'bg-green-500/10 text-green-400 border-green-500/20',
  L: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  XL: 'bg-red-500/10 text-red-400 border-red-500/20'
}

const SIZE_LABELS = {
  S: 'Small',
  M: 'Medium', 
  L: 'Large',
  XL: 'Extra Large'
}

export function VehicleCard({ 
  vehicle, 
  usage, 
  onEdit, 
  onDelete, 
  onPhotoManage 
}: VehicleCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getDaysUntilService = () => {
    if (!usage.next_recommended_service) return null
    const nextService = new Date(usage.next_recommended_service)
    const today = new Date()
    const diffTime = nextService.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilService = getDaysUntilService()

  return (
    <Card className="bg-card border-border hover:shadow-lg hover:shadow-primary/5 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Car className="h-5 w-5 text-primary" />
              {vehicle.registration}
            </CardTitle>
            <CardDescription>
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.color && ` • ${vehicle.color}`}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={SIZE_COLORS[vehicle.size]}>
              {SIZE_LABELS[vehicle.size]}
            </Badge>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Vehicle Image */}
        <div className="mb-4">
          <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Camera className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No photos</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              {usage.total_bookings}
            </div>
            <div className="text-xs text-muted-foreground">Total Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              {formatCurrency(usage.total_spent_pence)}
            </div>
            <div className="text-xs text-muted-foreground">Total Spent</div>
          </div>
        </div>

        {/* Service Reminder */}
        {daysUntilService !== null && (
          <div className={`p-3 rounded-lg mb-4 ${
            daysUntilService <= 7 
              ? 'bg-destructive/10 border border-destructive/20' 
              : daysUntilService <= 30
              ? 'bg-l4d-warning/10 border border-l4d-warning/20'
              : 'bg-l4d-success/10 border border-l4d-success/20'
          }`}>
            <div className="flex items-center gap-2">
              <Calendar className={`h-4 w-4 ${
                daysUntilService <= 7 
                  ? 'text-destructive' 
                  : daysUntilService <= 30
                  ? 'text-l4d-warning'
                  : 'text-l4d-success'
              }`} />
              <span className={`text-sm font-medium ${
                daysUntilService <= 7 
                  ? 'text-destructive' 
                  : daysUntilService <= 30
                  ? 'text-l4d-warning'
                  : 'text-l4d-success'
              }`}>
                {daysUntilService <= 0 
                  ? 'Service due now' 
                  : `Service due in ${daysUntilService} days`
                }
              </span>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {showDetails && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground">Last Service</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(usage.last_service_date)}
              </div>
            </div>
            
            {(vehicle as any).special_requirements && (
              <div>
                <div className="text-sm font-medium text-foreground">Special Requirements</div>
                <div className="text-sm text-muted-foreground">{(vehicle as any).special_requirements}</div>
              </div>
            )}
            
            {(vehicle as any).notes && (
              <div>
                <div className="text-sm font-medium text-foreground">Notes</div>
                <div className="text-sm text-muted-foreground">{(vehicle as any).notes}</div>
              </div>
            )}
            
            <div>
              <div className="text-sm font-medium text-foreground">Added</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(vehicle.created_at)}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPhotoManage(vehicle.id)}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          Photos
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onEdit(vehicle)}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onDelete(vehicle.id)}
          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}