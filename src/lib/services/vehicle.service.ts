import { createClient } from '@/lib/supabase/client'
import { VehicleRow, VehicleInsert, VehicleUpdate, VehicleSize } from '@/types/database.types'

// Import vehicle size data JSON (assuming it exists)
// Note: This would reference your 106K vehicle database
// For now, we'll use the vehicle_model_registry database table

type VehicleCreateData = {
  userId?: string | null
  registration: string
  make: string
  model: string
  year?: number
  color?: string
  size?: VehicleSize
}

type VehiclePricingInfo = {
  size: VehicleSize
  price_pence: number
  duration_minutes: number
}

export class VehicleService {
  private supabase = createClient()

  async getUserVehicles(userId: string) {
    const { data, error } = await this.supabase
      .from('vehicles')
      .select(`
        *,
        vehicle_photos(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user vehicles:', error)
      throw new Error('Failed to fetch vehicles')
    }
    return data
  }

  async getVehicleById(vehicleId: string) {
    const { data, error } = await this.supabase
      .from('vehicles')
      .select(`
        *,
        vehicle_photos(*)
      `)
      .eq('id', vehicleId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching vehicle:', error)
      throw new Error('Vehicle not found')
    }
    return data
  }

  async addVehicle(vehicleData: VehicleCreateData) {
    // Detect vehicle size if not provided
    let size = vehicleData.size
    if (!size) {
      size = await this.detectVehicleSize(vehicleData.make, vehicleData.model)
    }

    const vehicleInsert: VehicleInsert = {
      user_id: vehicleData.userId,
      registration: vehicleData.registration.toUpperCase(),
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      color: vehicleData.color,
      size: size
    }

    const { data, error } = await this.supabase
      .from('vehicles')
      .insert(vehicleInsert)
      .select()
      .single()

    if (error) {
      console.error('Error adding vehicle:', error)
      throw new Error('Failed to add vehicle')
    }
    return data
  }

  async updateVehicle(vehicleId: string, updates: VehicleUpdate) {
    const { data, error } = await this.supabase
      .from('vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .select()
      .single()

    if (error) {
      console.error('Error updating vehicle:', error)
      throw new Error('Failed to update vehicle')
    }
    return data
  }

  async deleteVehicle(vehicleId: string) {
    const { data, error } = await this.supabase
      .from('vehicles')
      .update({ is_active: false })
      .eq('id', vehicleId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting vehicle:', error)
      throw new Error('Failed to delete vehicle')
    }
    return data
  }

  async detectVehicleSize(make: string, model: string): Promise<VehicleSize> {
    // First check the vehicle model registry
    const { data: registryData, error: registryError } = await this.supabase
      .from('vehicle_model_registry')
      .select('default_size')
      .eq('make', make)
      .eq('model', model)
      .single()

    if (!registryError && registryData) {
      return registryData.default_size
    }

    // If not found in registry, add it with default size and mark as unverified
    const { data: insertData, error: insertError } = await this.supabase
      .from('vehicle_model_registry')
      .insert({
        make: make,
        model: model,
        default_size: 'medium',
        verified: false
      })
      .select('default_size')
      .single()

    if (insertError) {
      console.error('Error inserting into vehicle registry:', insertError)
      // If insert fails (e.g., due to unique constraint), try to fetch again
      const { data: retryData } = await this.supabase
        .from('vehicle_model_registry')
        .select('default_size')
        .eq('make', make)
        .eq('model', model)
        .single()
      
      return retryData?.default_size || 'medium'
    }

    return insertData.default_size
  }

  async getVehiclePricing(vehicleId: string): Promise<VehiclePricingInfo> {
    // Get vehicle size
    const { data: vehicle, error: vehicleError } = await this.supabase
      .from('vehicles')
      .select('size')
      .eq('id', vehicleId)
      .single()

    if (vehicleError) {
      console.error('Error fetching vehicle for pricing:', vehicleError)
      throw new Error('Vehicle not found')
    }

    // Get Full Valet pricing for this vehicle size
    const { data: pricing, error: pricingError } = await this.supabase
      .from('service_pricing')
      .select('price_pence, duration_minutes')
      .eq('vehicle_size', vehicle.size)
      .single()

    if (pricingError) {
      console.error('Error fetching pricing:', pricingError)
      throw new Error('Pricing not found for vehicle size')
    }

    return {
      size: vehicle.size,
      price_pence: pricing.price_pence,
      duration_minutes: pricing.duration_minutes
    }
  }

  async getPricingBySize(vehicleSize: VehicleSize): Promise<VehiclePricingInfo> {
    const { data: pricing, error } = await this.supabase
      .from('service_pricing')
      .select('price_pence, duration_minutes')
      .eq('vehicle_size', vehicleSize)
      .single()

    if (error) {
      console.error('Error fetching pricing by size:', error)
      throw new Error('Pricing not found for vehicle size')
    }

    return {
      size: vehicleSize,
      price_pence: pricing.price_pence,
      duration_minutes: pricing.duration_minutes
    }
  }

  async addVehiclePhoto(vehicleId: string, photoUrl: string, isPrimary: boolean = false) {
    const { data, error } = await this.supabase
      .from('vehicle_photos')
      .insert({
        vehicle_id: vehicleId,
        photo_url: photoUrl,
        is_primary: isPrimary
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding vehicle photo:', error)
      throw new Error('Failed to add vehicle photo')
    }
    return data
  }

  async deleteVehiclePhoto(photoId: string) {
    const { data, error } = await this.supabase
      .from('vehicle_photos')
      .delete()
      .eq('id', photoId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting vehicle photo:', error)
      throw new Error('Failed to delete vehicle photo')
    }
    return data
  }

  async getVehiclesByRegistration(registration: string) {
    const { data, error } = await this.supabase
      .from('vehicles')
      .select('*')
      .eq('registration', registration.toUpperCase())
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching vehicles by registration:', error)
      throw new Error('Failed to fetch vehicles')
    }
    return data
  }

  async searchVehicles(query: string, userId?: string) {
    let queryBuilder = this.supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId)
    }

    const { data, error } = await queryBuilder
      .or(`registration.ilike.%${query.toUpperCase()}%,make.ilike.%${query}%,model.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching vehicles:', error)
      throw new Error('Failed to search vehicles')
    }
    return data
  }

  // Helper methods
  formatVehicleDisplay(vehicle: VehicleRow): string {
    return `${vehicle.make} ${vehicle.model} (${vehicle.registration})`
  }

  getSizeLabel(size: VehicleSize): string {
    switch (size) {
      case 'small':
        return 'Small Car'
      case 'medium':
        return 'Medium Car'
      case 'large':
        return 'Large Car'
      case 'extra_large':
        return 'Extra Large Vehicle'
      default:
        return 'Medium Car'
    }
  }

  getSizeDescription(size: VehicleSize): string {
    switch (size) {
      case 'small':
        return 'Small cars like Toyota Aygo, Peugeot 107, Fiat 500'
      case 'medium':
        return 'Medium cars like Ford Focus, VW Golf, Honda Civic'
      case 'large':
        return 'Large cars like BMW 5 Series, Mercedes C-Class, Audi A4'
      case 'extra_large':
        return 'Large SUVs, vans, and commercial vehicles'
      default:
        return 'Standard family cars'
    }
  }

  async getVehicleStats(userId?: string) {
    let queryBuilder = this.supabase
      .from('vehicles')
      .select('size, created_at')
      .eq('is_active', true)

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error fetching vehicle stats:', error)
      throw new Error('Failed to fetch vehicle statistics')
    }

    const stats = {
      total: data.length,
      small: data.filter(v => v.size === 'small').length,
      medium: data.filter(v => v.size === 'medium').length,
      large: data.filter(v => v.size === 'large').length,
      extra_large: data.filter(v => v.size === 'extra_large').length,
      recent: data.filter(v => {
        const createdAt = new Date(v.created_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return createdAt > thirtyDaysAgo
      }).length
    }

    return stats
  }
}