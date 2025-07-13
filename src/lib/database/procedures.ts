/**
 * Database Procedures Service Layer
 * Thin wrapper around stored procedures for Love4Detailing database-first architecture
 */

import { createServerSupabase } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// Types for procedure parameters and returns
export interface AvailableSlot {
  slot_id: string
  slot_date: string
  start_time: string
  end_time: string
  available_capacity: number
  max_capacity: number
  service_duration: number
}

export interface ServicePricing {
  base_price_pence: number
  add_on_price_pence: number
  total_price_pence: number
  duration_minutes: number
  pricing_breakdown: any
}

export interface BookingTransaction {
  customer_data: {
    email: string
    name: string
    phone: string
    user_id?: string
  }
  vehicle_data: {
    id?: string
    registration: string
    make: string
    model: string
    year?: number
    color?: string
    size: 'small' | 'medium' | 'large' | 'extra_large'
  }
  booking_data: {
    slot_id: string
    service_id: string
    payment_method?: 'cash' | 'card' | 'bank_transfer' | 'loyalty_points'
    add_ons?: any[]
  }
}

export interface BookingResult {
  booking_id: string
  booking_reference: string
  total_price_pence: number
  estimated_duration: number
  success: boolean
  message: string
}

/**
 * Booking Management Procedures
 */
export class BookingProcedures {
  /**
   * Get enhanced available slots with intelligent recommendations
   */
  static async getEnhancedAvailableSlots(
    dateStart: string,
    dateEnd: string,
    serviceId?: string,
    vehicleSize?: 'small' | 'medium' | 'large' | 'extra_large',
    userId?: string
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Direct query since stored procedure was removed
      const { data, error } = await supabaseClient
        .from('available_slots')
        .select('*')
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .eq('is_available', true)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Create comprehensive booking with enhanced features
   * NOTE: Temporarily disabled to force fallback to improved vehicle creation logic
   */
  static async createEnhancedBooking(
    bookingData: any
  ): Promise<{ data: any | null; error: any }> {
    try {
      // Force fallback to improved direct booking creation that handles vehicles properly
      console.log('🔄 Stored procedure intentionally disabled - using fallback for vehicle creation')
      return { 
        data: null, 
        error: { message: 'Stored procedure disabled - using fallback with vehicle creation' } 
      }
      
      // Original code commented out until vehicle creation is properly implemented:
      // const supabaseClient = createServerSupabase()
      // const { data, error } = await supabaseClient
      //   .from('bookings')
      //   .insert([bookingData])
      //   .select()
      //   .single()
      // return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Calculate enhanced pricing with discounts and surcharges
   */
  static async calculateEnhancedPricing(
    serviceId: string,
    vehicleSize: 'small' | 'medium' | 'large' | 'extra_large',
    slotDate?: string,
    isRepeatCustomer: boolean = false,
    userId?: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Direct query since stored procedure was removed
      const { data, error } = await supabaseClient
        .from('service_pricing')
        .select('*')
        .eq('service_id', serviceId)
        .eq('vehicle_size', vehicleSize)
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get user booking history with analytics
   */
  static async getUserBookingHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Direct query since stored procedure was removed
      const { data, error } = await supabaseClient
        .from('bookings')
        .select(`
          *,
          vehicles!inner(registration, make, model, year, color),
          services!inner(name, base_price_pence)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return { data: data || [], error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Cancel booking with enhanced logic
   */
  static async cancelBooking(
    bookingId: string,
    reason: string,
    cancelledBy?: string,
    refundAmount?: number
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Direct update since stored procedure was removed
      const { data, error } = await supabaseClient
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          notes: reason || 'Booking cancelled'
        })
        .eq('id', bookingId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }
  /**
   * Get available booking slots within date range
   */
  static async getAvailableSlots(
    dateStart: string,
    dateEnd: string,
    serviceId?: string
  ): Promise<{ data: AvailableSlot[] | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Direct query since stored procedure was removed
      const { data: rawData, error } = await supabaseClient
        .from('available_slots')
        .select('*')
        .gte('slot_date', dateStart)
        .lte('slot_date', dateEnd)
        .eq('is_blocked', false)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) return { data: null, error }

      // Transform to expected format
      const transformedData = rawData?.map((slot: any) => ({
        slot_id: slot.id,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        available_capacity: (slot.max_bookings || 1) - (slot.current_bookings || 0),
        max_capacity: slot.max_bookings || 1,
        service_duration: 120 // Default 2 hours
      })) || []

      return { data: transformedData, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Calculate dynamic service pricing
   */
  static async calculateServicePricing(
    serviceId: string,
    vehicleSize: 'small' | 'medium' | 'large' | 'extra_large',
    addOns: any[] = []
  ): Promise<{ data: ServicePricing | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Direct query since stored procedure was removed
      const { data, error } = await supabaseClient
        .from('service_pricing')
        .select('*')
        .eq('service_id', serviceId)
        .eq('vehicle_size', vehicleSize)
        .single()

      // Transform to expected format
      const transformedData = data ? {
        base_price_pence: data.price_pence,
        add_on_price_pence: 0, // Calculate from addOns if needed
        total_price_pence: data.price_pence,
        duration_minutes: 120, // Default
        pricing_breakdown: {}
      } : null

      return { data: transformedData, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Process complete booking transaction atomically
   */
  static async processBookingTransaction(
    transaction: any
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      console.log('🔄 Processing booking transaction:', {
        customer: transaction.customer_data?.email,
        slot: transaction.booking_data?.slot_id,
        vehicle: transaction.vehicle_data?.registration
      })

      // Start a database transaction
      const { data: bookingResult, error: bookingError } = await supabaseClient.rpc('create_booking_with_slot_update', {
        p_customer_data: transaction.customer_data,
        p_vehicle_data: transaction.vehicle_data,
        p_booking_data: transaction.booking_data,
        p_pricing: transaction.pricing
      })

      if (bookingError) {
        console.error('❌ Booking transaction failed:', bookingError)
        return { data: null, error: bookingError }
      }

      console.log('✅ Booking transaction completed:', bookingResult)
      return { data: bookingResult, error: null }
    } catch (error) {
      console.error('❌ Error in processBookingTransaction:', error)
      return { data: null, error }
    }
  }
}

/**
 * Customer Rewards Procedures
 */
export class RewardsProcedures {
  /**
   * Update customer rewards with points and tier calculation
   */
  static async updateCustomerRewards(
    userId: string,
    pointsEarned: number,
    transactionType: 'earned' | 'redeemed' | 'expired' | 'adjusted',
    bookingId?: string,
    description?: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get customer tier benefits and transaction history
   */
  static async getCustomerTierBenefits(
    userId: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }
}

/**
 * Schedule Management Procedures
 * Note: Template-based scheduling was removed during database cleanup.
 * Basic slot management is now handled directly through admin/schedule API routes.
 */

/**
 * Analytics Procedures
 */
export class AnalyticsProcedures {
  /**
   * Get comprehensive booking analytics
   */
  static async getBookingAnalytics(
    dateStart: string,
    dateEnd: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get revenue dashboard data
   */
  static async getRevenueDashboard(
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get operational metrics
   */
  static async getOperationalMetrics(): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Edit existing booking with audit trail
   */
  static async editExistingBooking(
    bookingId: string,
    changes: any,
    adminUserId: string,
    reason?: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Manage service catalog (CRUD operations)
   */
  static async manageServiceCatalog(
    action: 'create' | 'update' | 'delete',
    serviceData: any,
    adminUserId: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Update pricing matrix with bulk changes
   */
  static async updatePricingMatrix(
    pricingChanges: any[],
    adminUserId: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get customer insights for admin dashboard
   */
  static async getCustomerInsights(
    userId?: string
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }
}

/**
 * Authentication Procedures
 */
export class AuthProcedures {
  /**
   * Create user profile after Supabase auth user creation
   */
  static async createUserProfile(
    userId: string,
    email: string,
    fullName: string,
    phone?: string,
    role: 'customer' | 'admin' | 'staff' | 'super_admin' = 'customer',
    marketingOptIn: boolean = false,
    servicePreferences: any = {}
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TODO: Replace with direct database operations - stored procedure was removed
      console.warn('create_user_profile stored procedure removed - using direct insert')
      const { data, error } = await supabaseClient
        .from('users')
        .insert({
          id: userId,
          email: email,
          full_name: fullName,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      /*
      // Original stored procedure call (removed during cleanup):
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }      */

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Update user profile with partial data
   */
  static async updateUserProfile(
    userId: string,
    profileData: any
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TODO: Replace with direct database operations - stored procedure was removed
      console.warn('update_user_profile stored procedure removed - using direct update')
      const { data, error } = await supabaseClient
        .from('users')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Handle user login and update login timestamp
   * TODO: Replace with direct database operations - stored procedure was removed during cleanup
   */
  static async handleUserLogin(
    userId: string,
    email: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Check if user profile exists
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        return { data: null, error: fetchError }
      }
      
      // If user doesn't exist, create profile
      if (!existingUser) {
        // Determine role based on email
        let role = 'customer'
        if (email === 'paul@evans-studio.co.uk') {
          role = 'super_admin'
        } else if (email === 'zell@love4detailing.com') {
          role = 'admin'
        }

        const { data: newUser, error: createError } = await supabaseClient
          .from('users')
          .insert({
            id: userId,
            email: email,
            full_name: email.split('@')[0], // Fallback name from email
            role: role,
            is_active: true,
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (createError) {
          return { data: null, error: createError }
        }
        
        // Create initial customer rewards record
        const { error: rewardsError } = await supabaseClient
          .from('customer_rewards')
          .insert({
            user_id: userId,
            customer_email: email,
            total_points: 0,
            points_lifetime: 0,
            current_tier: 'bronze'
          })
        
        if (rewardsError) {
          console.warn('Warning: Failed to create customer_rewards record:', rewardsError)
          // Don't fail login if rewards creation fails
        }
        
        return { data: newUser, error: null }
      }
      
      // Update last login timestamp
      const { data: updatedUser, error: updateError } = await supabaseClient
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      
      return { data: updatedUser, error: updateError }
    } catch (error) {
      console.error('Error in handleUserLogin:', error)
      return { data: null, error }
    }
  }

  /**
   * Get user profile with permissions and statistics
   */
  static async getUserProfile(
    userId: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Direct query since stored procedure was removed
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Update user role (admin only)
   */
  static async updateUserRole(
    userId: string,
    newRole: 'customer' | 'admin' | 'staff' | 'super_admin',
    adminUserId: string,
    reason?: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Check user permissions for specific action
   */
  static async checkUserPermission(
    userId: string,
    permission: string
  ): Promise<{ data: boolean | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data || false, error }
    } catch (error) {
      return { data: false, error }
    }
  }

  /**
   * Validate user session
   */
  static async validateUserSession(
    userId: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      
      // Check if user exists and is active
      const { data, error } = await supabaseClient
        .from('users')
        .select('id, email, full_name, role, is_active, last_login_at')
        .eq('id', userId)
        .eq('is_active', true)
        .single()
      
      if (error) {
        return { data: null, error }
      }
      
      // Return user data if validation successful
      return { data, error: null }
    } catch (error) {
      console.error('Error in validateUserSession:', error)
      return { data: null, error }
    }
  }
}

/**
 * Vehicle Management Procedures
 */
export class VehicleProcedures {
  /**
   * Create, update, or delete vehicle with intelligent size detection
   */
  static async manageVehicle(
    action: 'create' | 'update' | 'delete',
    vehicleData: any,
    userId?: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Detect vehicle size based on make and model
   */
  static async detectVehicleSize(
    make: string,
    model: string,
    year?: number
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get user's vehicles with usage statistics
   */
  static async getUserVehicles(
    userId: string,
    includeInactive: boolean = false
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Manage vehicle photos (upload, delete, set primary)
   */
  static async manageVehiclePhoto(
    action: 'upload' | 'delete' | 'set_primary',
    vehicleId: string,
    userId: string,
    photoData: any = {}
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Admin: Manage vehicle model registry
   */
  static async manageVehicleRegistry(
    action: 'add' | 'update' | 'verify' | 'bulk_update',
    registryData: any,
    adminUserId: string
  ): Promise<{ data: any | null; error: any }> {
    try {
      const supabaseClient = createServerSupabase()
      // TEMP: Stored procedure removed - using placeholder
      const { data, error } = { data: null, error: null }
      return { data: data?.[0] || null, error }
    } catch (error) {
      return { data: null, error }
    }
  }
}

/**
 * Unified Database Service
 * Provides a single interface to all database procedures
 */
export class DatabaseService {
  static auth = AuthProcedures
  static vehicle = VehicleProcedures
  static booking = BookingProcedures
  static rewards = RewardsProcedures
  static analytics = AnalyticsProcedures
}