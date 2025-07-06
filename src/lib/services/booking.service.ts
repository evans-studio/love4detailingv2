import { createClient } from '@/lib/supabase/client'
import { 
  Database, 
  BookingRow, 
  ServiceRow, 
  VehicleSize, 
  BookingStatus,
  PaymentMethod 
} from '@/types/database.types'

type BookingCreateData = {
  customerEmail: string
  customerName: string
  customerPhone: string
  slotId: string
  vehicleId?: string
  userId?: string
  paymentMethod?: PaymentMethod
}

type BookingTransactionResult = {
  booking_id: string
  booking_reference: string
  total_price: number
}

export class BookingService {
  private supabase = createClient()

  async getFullValetService() {
    // Since we only have one service (Full Valet), fetch it directly
    const { data, error } = await this.supabase
      .from('services')
      .select(`
        *,
        service_pricing(*)
      `)
      .eq('code', 'full_valet')
      .single()

    if (error) {
      console.error('Error fetching Full Valet service:', error)
      throw new Error('Failed to fetch service details')
    }
    return data
  }

  async getServicePriceByVehicleSize(vehicleSize: VehicleSize) {
    const { data, error } = await this.supabase
      .from('service_pricing')
      .select('price_pence, duration_minutes')
      .eq('vehicle_size', vehicleSize)
      .single()

    if (error) {
      console.error('Error fetching service pricing:', error)
      throw new Error(`Failed to fetch pricing for ${vehicleSize} vehicles`)
    }
    return data
  }

  async getAvailableSlots(date: string) {
    const { data, error } = await this.supabase
      .from('available_slots')
      .select('*')
      .eq('slot_date', date)
      .eq('is_blocked', false)
      .lt('current_bookings', this.supabase.raw('max_bookings'))
      .order('start_time')

    if (error) {
      console.error('Error fetching available slots:', error)
      throw new Error('Failed to fetch available time slots')
    }
    return data
  }

  async createBooking(bookingData: BookingCreateData): Promise<BookingTransactionResult> {
    // Get the Full Valet service
    const service = await this.getFullValetService()

    const { data, error } = await this.supabase
      .rpc('create_booking_transaction', {
        p_customer_email: bookingData.customerEmail,
        p_customer_name: bookingData.customerName,
        p_customer_phone: bookingData.customerPhone,
        p_service_id: service.id, // Always Full Valet
        p_slot_id: bookingData.slotId,
        p_vehicle_id: bookingData.vehicleId,
        p_user_id: bookingData.userId,
        p_payment_method: bookingData.paymentMethod || 'cash'
      })

    if (error) {
      console.error('Error creating booking:', error)
      throw new Error(error.message || 'Failed to create booking')
    }
    
    if (!data || data.length === 0) {
      throw new Error('No booking data returned from transaction')
    }

    return data[0]
  }

  async getBookingDetails(bookingReference: string) {
    const { data, error } = await this.supabase
      .from('booking_summaries')
      .select('*')
      .eq('booking_reference', bookingReference)
      .single()

    if (error) {
      console.error('Error fetching booking details:', error)
      throw new Error('Booking not found')
    }
    return data
  }

  async updateBookingStatus(
    bookingId: string, 
    status: BookingStatus,
    reason?: string
  ) {
    const { data, error } = await this.supabase
      .rpc('update_booking_status', {
        p_booking_id: bookingId,
        p_new_status: status,
        p_reason: reason
      })

    if (error) {
      console.error('Error updating booking status:', error)
      throw new Error('Failed to update booking status')
    }
    
    if (!data || data.length === 0) {
      throw new Error('No booking status update data returned')
    }

    return data[0]
  }

  async getUserBookings(userId: string, limit: number = 10, offset: number = 0) {
    const { data, error } = await this.supabase
      .rpc('get_user_booking_history', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      })

    if (error) {
      console.error('Error fetching user bookings:', error)
      throw new Error('Failed to fetch booking history')
    }
    return data
  }

  async getBookingsByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('booking_summaries')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings by email:', error)
      throw new Error('Failed to fetch bookings')
    }
    return data
  }

  async getAllBookings(limit: number = 50, offset: number = 0) {
    const { data, error } = await this.supabase
      .from('booking_summaries')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching all bookings:', error)
      throw new Error('Failed to fetch bookings')
    }
    return data
  }

  async getBookingsByStatus(status: BookingStatus, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('booking_summaries')
      .select('*')
      .eq('status', status)
      .order('slot_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching bookings by status:', error)
      throw new Error('Failed to fetch bookings')
    }
    return data
  }

  async getBookingsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await this.supabase
      .from('booking_summaries')
      .select('*')
      .gte('slot_date', startDate)
      .lte('slot_date', endDate)
      .order('slot_date', { ascending: true })

    if (error) {
      console.error('Error fetching bookings by date range:', error)
      throw new Error('Failed to fetch bookings')
    }
    return data
  }

  async cancelBooking(bookingId: string, reason: string) {
    return this.updateBookingStatus(bookingId, 'cancelled', reason)
  }

  async confirmBooking(bookingId: string) {
    return this.updateBookingStatus(bookingId, 'confirmed')
  }

  async startBooking(bookingId: string) {
    return this.updateBookingStatus(bookingId, 'in_progress')
  }

  async completeBooking(bookingId: string) {
    return this.updateBookingStatus(bookingId, 'completed')
  }

  async markAsNoShow(bookingId: string) {
    return this.updateBookingStatus(bookingId, 'no_show')
  }

  // Helper method to format price for display
  formatPrice(priceInPence: number): string {
    return `£${(priceInPence / 100).toFixed(2)}`
  }

  // Helper method to format date and time for display
  formatDateTime(date: string, time: string): string {
    const dateObj = new Date(`${date}T${time}`)
    return dateObj.toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}