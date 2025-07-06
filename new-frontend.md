Objective
Align the entire frontend application with the new refactored database schema, ensuring consistent styling from the homepage through all dashboard pages, modals, and components. The frontend must adapt to match the database logic, not the other way around.

📋 Implementation Instructions
Context
The database has been completely refactored with the following key changes:

time_slots → available_slots (with start_time/end_time instead of slot_time)
Only one service exists: "Full Valet" with vehicle size-based pricing
Pricing: Small £50, Medium £60, Large £70, Extra Large £85
New booking flow uses create_booking_transaction database function
Vehicle sizes are detected from a 106K+ entry JSON file
Consolidated rewards system in customer_rewards table
Phase 1: Audit Current Frontend
Identify all database queries in:
/src/app/api/* - All API routes
/src/lib/api/* - API utilities
/src/lib/services/* - Service layers
/src/components/* - Any direct Supabase calls
List all components that reference old schema:
Components using time_slots
Components showing multiple services
Components using old vehicle_sizes table
Admin components using old table names
Phase 2: Update Core Services
Create or update these service files to match the new schema:

/src/lib/services/booking.service.ts

typescript
import { createClient } from '@/lib/supabase/client'
import { vehicleSizeData } from '@/data/vehicle-size-data'

export class BookingService {
  private supabase = createClient()

  // Get the single Full Valet service
  async getFullValetService() {
    const { data, error } = await this.supabase
      .from('services')
      .select('*, service_pricing(*)')
      .eq('code', 'full_valet')
      .single()
    
    if (error) throw error
    return data
  }

  // Get available slots for a date
  async getAvailableSlots(date: string) {
    const { data, error } = await this.supabase
      .from('available_slots')
      .select('*')
      .eq('slot_date', date)
      .eq('is_blocked', false)
      .lt('current_bookings', this.supabase.raw('max_bookings'))
      .order('start_time')
    
    if (error) throw error
    return data
  }

  // Create booking using database function
  async createBooking(bookingData: {
    customerEmail: string
    customerName: string
    customerPhone: string
    slotId: string
    vehicleId?: string
    userId?: string
  }) {
    const service = await this.getFullValetService()
    
    const { data, error } = await this.supabase
      .rpc('create_booking_transaction', {
        p_customer_email: bookingData.customerEmail,
        p_customer_name: bookingData.customerName,
        p_customer_phone: bookingData.customerPhone,
        p_service_id: service.id,
        p_slot_id: bookingData.slotId,
        p_vehicle_id: bookingData.vehicleId,
        p_user_id: bookingData.userId,
        p_payment_method: 'cash'
      })
    
    if (error) throw error
    return data
  }
}
Phase 3: Update Booking Flow Components
The booking flow should be exactly 4 steps (no service selection):

Vehicle Details → 2. Date/Time → 3. Contact Info → 4. Payment/Confirmation
Update these components:

/src/components/booking/BookingFlow.tsx

Remove service selection step
Start with vehicle details
Show price immediately after vehicle size detection
/src/components/booking/VehicleDetails.tsx

Integrate vehicle size detection from JSON
Display price based on detected size
Show: "Full Valet Service - £[price]"
/src/components/booking/TimeSlotPicker.tsx

Query available_slots not time_slots
Display start_time - end_time format
Check availability: current_bookings < max_bookings
Phase 4: Update Admin Components
/src/components/admin/BookingsTable.tsx

Use booking_summaries view for data
Remove service selection (always Full Valet)
Update column names to match new schema
/src/components/admin/AvailabilityManager.tsx

Work with available_slots table
Allow blocking/unblocking slots
Show current_bookings/max_bookings for each slot
Phase 5: Ensure Consistent Styling
Apply these styles consistently across ALL components:

typescript
// Style constants to use everywhere
const styles = {
  // Brand colors
  primary: 'bg-purple-600 hover:bg-purple-700',
  primaryText: 'text-purple-600',
  
  // Consistent spacing
  containerPadding: 'px-4 md:px-6 lg:px-8',
  sectionSpacing: 'py-12 md:py-16 lg:py-20',
  
  // Card styles (use for all cards)
  card: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
  cardHover: 'hover:shadow-md transition-shadow duration-200',
  
  // Button styles (use for all buttons)
  buttonPrimary: 'bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium',
  buttonSecondary: 'bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium',
  
  // Modal styles
  modalOverlay: 'fixed inset-0 bg-black bg-opacity-50 z-50',
  modalContent: 'bg-white rounded-lg shadow-xl max-w-md w-full mx-4',
  
  // Dashboard layout
  dashboardSidebar: 'bg-gray-900 text-white w-64',
  dashboardContent: 'flex-1 bg-gray-50'
}
Phase 6: Update API Routes
Update all API routes to use new schema:

/src/app/api/bookings/route.ts

typescript
export async function POST(request: Request) {
  const data = await request.json()
  
  // Always use Full Valet service
  const bookingService = new BookingService()
  const result = await bookingService.createBooking(data)
  
  return NextResponse.json(result)
}
/src/app/api/availability/[date]/route.ts

typescript
export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  const bookingService = new BookingService()
  const slots = await bookingService.getAvailableSlots(params.date)
  
  return NextResponse.json(slots)
}
Phase 7: Testing Checklist
Test each of these flows:

✅ Homepage loads with consistent styling
✅ Booking flow works without service selection
✅ Vehicle size detection shows correct price
✅ Available slots display properly
✅ Booking creates successfully
✅ Confirmation shows booking reference
✅ User dashboard shows bookings
✅ Admin can view all bookings
✅ Admin can manage availability
✅ All modals use consistent styling
Phase 8: TypeScript Updates
Ensure all types match the database:

typescript
// types/database.ts
export interface AvailableSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  max_bookings: number
  current_bookings: number
  is_blocked: boolean
}

export interface Booking {
  id: string
  booking_reference: string
  customer_email: string
  customer_name: string
  customer_phone: string
  service_id: string
  slot_id: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  total_price_pence: number
  // ... other fields
}
Critical Rules:
Never modify the database schema - Frontend must adapt to database
Use database functions - Call create_booking_transaction for bookings
Single service only - No service selection, only Full Valet
Consistent styling - Every component must follow the style guide
Price by size - Always calculate price from vehicle size
Use views - Use booking_summaries for admin displays
File Priority Order:
Services layer first
API routes second
Booking components third
Dashboard components fourth
Admin components last
Remember: The database is the source of truth. Every frontend component must align with the database structure, not the other way around.

