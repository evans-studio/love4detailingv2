/**
 * Customer Profile API Service
 * Real API integration for customer profile management
 * 
 * This service provides comprehensive API integration for:
 * - User profile data management
 * - Vehicle information and management
 * - Booking history and details
 * - Rewards and loyalty information
 * - User statistics and analytics
 */

// Types for API responses
export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  profile_complete: boolean
  user_journey: 'booking-first' | 'account-first'
  registration_date: string
  last_login: string
  is_active: boolean
  email_verified_at?: string
  avatar_url?: string
  role: 'customer' | 'admin' | 'super_admin'
}

export interface Vehicle {
  id: string
  user_id: string
  registration: string
  make: string
  model: string
  year: number
  color: string
  size: 'S' | 'M' | 'L' | 'XL'
  size_confirmed: boolean
  photo_url?: string
  last_service_date?: string
  booking_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  pricing?: {
    small: number
    medium: number
    large: number
    extraLarge: number
  }
}

export interface Booking {
  id: string
  reference: string
  user_id: string
  vehicle_id: string
  service_name: string
  service_category: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  booking_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  base_price: number
  final_price: number
  notes?: string
  vehicle: {
    registration: string
    make: string
    model: string
    year: number
    color: string
    size: string
  }
  customer: {
    full_name: string
    email: string
    phone?: string
  }
  created_at: string
  updated_at: string
}

export interface RewardTransaction {
  id: string
  user_id: string
  booking_id?: string
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus'
  points: number
  description: string
  transaction_date: string
  expires_at?: string
}

export interface RewardsData {
  total_points: number
  available_points: number
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  tier_progress: number
  points_to_next_tier: number
  next_tier?: string
  lifetime_points: number
  recent_transactions: RewardTransaction[]
}

export interface UserStatistics {
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  total_spent: number
  average_booking_value: number
  favorite_service?: string
  most_used_vehicle?: string
  member_since: string
  last_booking_date?: string
  next_booking_date?: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

// API Service Class
export class CustomerProfileAPI {

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data, error: null, success: true }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch profile', 
        success: false 
      }
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data, error: null, success: true }
    } catch (error) {
      console.error('Error updating user profile:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to update profile', 
        success: false 
      }
    }
  }

  /**
   * Get user's vehicles
   */
  async getUserVehicles(includeInactive = false): Promise<ApiResponse<Vehicle[]>> {
    try {
      const url = new URL('/api/vehicles', window.location.origin)
      if (includeInactive) {
        url.searchParams.set('include_inactive', 'true')
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data || [], error: null, success: true }
    } catch (error) {
      console.error('Error fetching user vehicles:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch vehicles', 
        success: false 
      }
    }
  }

  /**
   * Create a new vehicle
   */
  async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Vehicle>> {
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(vehicleData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data, error: null, success: true }
    } catch (error) {
      console.error('Error creating vehicle:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to create vehicle', 
        success: false 
      }
    }
  }

  /**
   * Update an existing vehicle
   */
  async updateVehicle(vehicleId: string, vehicleData: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(vehicleData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data, error: null, success: true }
    } catch (error) {
      console.error('Error updating vehicle:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to update vehicle', 
        success: false 
      }
    }
  }

  /**
   * Delete a vehicle
   */
  async deleteVehicle(vehicleId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: true, error: null, success: true }
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to delete vehicle', 
        success: false 
      }
    }
  }

  /**
   * Get user's booking history
   */
  async getBookingHistory(limit = 50, offset = 0): Promise<ApiResponse<Booking[]>> {
    try {
      const url = new URL('/api/bookings/history', window.location.origin)
      url.searchParams.set('limit', limit.toString())
      url.searchParams.set('offset', offset.toString())

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data || [], error: null, success: true }
    } catch (error) {
      console.error('Error fetching booking history:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch booking history', 
        success: false 
      }
    }
  }

  /**
   * Get user's rewards information
   * Note: This endpoint doesn't exist yet, so we'll create it
   */
  async getRewardsData(): Promise<ApiResponse<RewardsData>> {
    try {
      const response = await fetch('/api/rewards', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data, error: null, success: true }
    } catch (error) {
      console.error('Error fetching rewards data:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch rewards data', 
        success: false 
      }
    }
  }

  /**
   * Get user statistics
   * Note: This endpoint doesn't exist yet, so we'll create it
   */
  async getUserStatistics(): Promise<ApiResponse<UserStatistics>> {
    try {
      const response = await fetch('/api/user/statistics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error, success: false }
      }

      return { data: result.data, error: null, success: true }
    } catch (error) {
      console.error('Error fetching user statistics:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch user statistics', 
        success: false 
      }
    }
  }

  /**
   * Bulk operations for selected items
   */
  async bulkDeleteVehicles(vehicleIds: string[]): Promise<ApiResponse<boolean>> {
    try {
      const deletePromises = vehicleIds.map(id => this.deleteVehicle(id))
      const results = await Promise.allSettled(deletePromises)
      
      const failed = results.filter(result => result.status === 'rejected')
      if (failed.length > 0) {
        return { 
          data: null, 
          error: `Failed to delete ${failed.length} vehicles`, 
          success: false 
        }
      }

      return { data: true, error: null, success: true }
    } catch (error) {
      console.error('Error bulk deleting vehicles:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to bulk delete vehicles', 
        success: false 
      }
    }
  }

  /**
   * Search and filter functionality
   */
  async searchVehicles(query: string): Promise<ApiResponse<Vehicle[]>> {
    try {
      const vehicles = await this.getUserVehicles()
      if (!vehicles.success || !vehicles.data) {
        return vehicles
      }

      const filteredVehicles = vehicles.data.filter(vehicle => 
        vehicle.registration.toLowerCase().includes(query.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(query.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(query.toLowerCase()) ||
        vehicle.color.toLowerCase().includes(query.toLowerCase())
      )

      return { data: filteredVehicles, error: null, success: true }
    } catch (error) {
      console.error('Error searching vehicles:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to search vehicles', 
        success: false 
      }
    }
  }

  /**
   * Search and filter bookings
   */
  async searchBookings(query: string): Promise<ApiResponse<Booking[]>> {
    try {
      const bookings = await this.getBookingHistory()
      if (!bookings.success || !bookings.data) {
        return bookings
      }

      const filteredBookings = bookings.data.filter(booking => 
        booking.service_name.toLowerCase().includes(query.toLowerCase()) ||
        booking.vehicle.registration.toLowerCase().includes(query.toLowerCase()) ||
        booking.reference.toLowerCase().includes(query.toLowerCase())
      )

      return { data: filteredBookings, error: null, success: true }
    } catch (error) {
      console.error('Error searching bookings:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to search bookings', 
        success: false 
      }
    }
  }
}

// Export singleton instance
export const customerProfileAPI = new CustomerProfileAPI()