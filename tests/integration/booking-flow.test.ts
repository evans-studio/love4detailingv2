import { createClient } from '@supabase/supabase-js'
import { BookingService } from '@/lib/services/booking.service'
import { VehicleService } from '@/lib/services/vehicle.service'

// Note: This test file requires the proper environment variables to be set
// SUPABASE_URL and SUPABASE_SERVICE_KEY for the test environment

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Full Valet Booking Flow Integration', () => {
  let bookingService: BookingService
  let vehicleService: VehicleService
  let testSlotId: string
  let fullValetServiceId: string

  beforeAll(async () => {
    bookingService = new BookingService()
    vehicleService = new VehicleService()
    
    // Get the Full Valet service
    const { data: service } = await supabase
      .from('services')
      .select('id')
      .eq('code', 'full_valet')
      .single()
    
    if (!service) {
      throw new Error('Full Valet service not found in database')
    }
    
    fullValetServiceId = service.id

    // Create available slot for testing
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const { data: slot } = await supabase
      .from('available_slots')
      .insert({
        slot_date: tomorrow.toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '12:00:00', // 2 hours for medium vehicle
        max_bookings: 1
      })
      .select()
      .single()
    
    if (!slot) {
      throw new Error('Failed to create test slot')
    }
    
    testSlotId = slot.id
  })

  test('Vehicle size detection returns correct pricing', async () => {
    // Test known vehicles from the vehicle registry
    const testCases = [
      { make: 'Toyota', model: 'Aygo', expectedSize: 'small', expectedPrice: 5000 },
      { make: 'Ford', model: 'Focus', expectedSize: 'medium', expectedPrice: 6000 },
      { make: 'BMW', model: 'X5', expectedSize: 'large', expectedPrice: 7000 },
      { make: 'Ford', model: 'Transit', expectedSize: 'extra_large', expectedPrice: 8500 }
    ]

    for (const testCase of testCases) {
      const size = await vehicleService.detectVehicleSize(testCase.make, testCase.model)
      expect(size).toBe(testCase.expectedSize)

      const pricing = await bookingService.getServicePriceByVehicleSize(size)
      expect(pricing.price_pence).toBe(testCase.expectedPrice)
    }
  })

  test('Anonymous user books Full Valet with automatic size detection', async () => {
    // Vehicle details
    const vehicleData = {
      registration: 'TEST123',
      make: 'Honda',
      model: 'Civic',
      // Size will be detected automatically
    }

    // Detect vehicle size
    const detectedSize = await vehicleService.detectVehicleSize(
      vehicleData.make,
      vehicleData.model
    )
    expect(detectedSize).toBe('medium') // Civic is a medium car

    // Create booking
    const bookingData = {
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      customerPhone: '07123456789',
      slotId: testSlotId
    }

    const result = await bookingService.createBooking(bookingData)

    expect(result).toBeDefined()
    expect(result.booking_reference).toMatch(/^BK-/)
    expect(result.total_price).toBe(6000) // £60 for medium vehicle

    // Verify booking was created with Full Valet service
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, services(code)')
      .eq('id', result.booking_id)
      .single()

    expect(booking?.status).toBe('pending')
    expect(booking?.services?.code).toBe('full_valet')
    expect(booking?.service_price_pence).toBe(6000)
  })

  test('Pricing varies correctly by vehicle size', async () => {
    const sizes = ['small', 'medium', 'large', 'extra_large'] as const
    const expectedPrices = {
      small: 5000,      // £50
      medium: 6000,     // £60
      large: 7000,      // £70
      extra_large: 8500 // £85
    }

    for (const size of sizes) {
      const pricing = await bookingService.getServicePriceByVehicleSize(size)
      expect(pricing.price_pence).toBe(expectedPrices[size])
    }
  })

  test('Unknown vehicle defaults to medium size', async () => {
    const size = await vehicleService.detectVehicleSize(
      'UnknownMake',
      'UnknownModel'
    )
    expect(size).toBe('medium')

    // Check it was logged to registry
    const { data: registry } = await supabase
      .from('vehicle_model_registry')
      .select('*')
      .eq('make', 'UnknownMake')
      .eq('model', 'UnknownModel')
      .single()

    expect(registry).toBeDefined()
    expect(registry?.default_size).toBe('medium')
    expect(registry?.verified).toBe(false)
  })

  test('Full booking flow with all steps', async () => {
    // Step 1: Vehicle details and size detection
    const vehicleSize = await vehicleService.detectVehicleSize('Audi', 'A4')
    expect(vehicleSize).toBe('medium')

    // Step 2: Get pricing
    const pricing = await bookingService.getServicePriceByVehicleSize(vehicleSize)
    expect(pricing.price_pence).toBe(6000)
    expect(pricing.duration_minutes).toBe(120)

    // Step 3: Check slot availability
    const slots = await bookingService.getAvailableSlots(
      new Date().toISOString().split('T')[0]
    )
    expect(slots).toBeDefined()

    // Step 4: Create booking
    const booking = await bookingService.createBooking({
      customerEmail: 'fullflow@example.com',
      customerName: 'Full Flow Test',
      customerPhone: '07999999999',
      slotId: testSlotId
    })

    expect(booking.booking_reference).toBeDefined()
    expect(booking.total_price).toBe(6000)
  })

  test('Booking status updates work correctly', async () => {
    // Create a test booking first
    const booking = await bookingService.createBooking({
      customerEmail: 'status-test@example.com',
      customerName: 'Status Test',
      customerPhone: '07888888888',
      slotId: testSlotId
    })

    // Test status progression
    const confirmResult = await bookingService.confirmBooking(booking.booking_id)
    expect(confirmResult.new_status).toBe('confirmed')
    expect(confirmResult.old_status).toBe('pending')

    const startResult = await bookingService.startBooking(booking.booking_id)
    expect(startResult.new_status).toBe('in_progress')
    expect(startResult.old_status).toBe('confirmed')

    const completeResult = await bookingService.completeBooking(booking.booking_id)
    expect(completeResult.new_status).toBe('completed')
    expect(completeResult.old_status).toBe('in_progress')
  })

  test('Booking cancellation works correctly', async () => {
    // Create a test booking
    const booking = await bookingService.createBooking({
      customerEmail: 'cancel-test@example.com',
      customerName: 'Cancel Test',
      customerPhone: '07777777777',
      slotId: testSlotId
    })

    // Cancel the booking
    const cancelResult = await bookingService.cancelBooking(
      booking.booking_id,
      'Customer requested cancellation'
    )

    expect(cancelResult.new_status).toBe('cancelled')
    expect(cancelResult.old_status).toBe('pending')

    // Verify the booking is cancelled in the database
    const { data: cancelledBooking } = await supabase
      .from('bookings')
      .select('status, cancellation_reason')
      .eq('id', booking.booking_id)
      .single()

    expect(cancelledBooking?.status).toBe('cancelled')
    expect(cancelledBooking?.cancellation_reason).toBe('Customer requested cancellation')
  })

  test('Vehicle CRUD operations work correctly', async () => {
    // Create a test user (in a real test environment, this would be handled differently)
    const testUserId = 'test-user-id-12345'

    // Add vehicle
    const vehicleData = {
      userId: testUserId,
      registration: 'TESTCAR1',
      make: 'TestMake',
      model: 'TestModel',
      year: 2020,
      color: 'Blue'
    }

    const addedVehicle = await vehicleService.addVehicle(vehicleData)
    expect(addedVehicle.registration).toBe('TESTCAR1')
    expect(addedVehicle.make).toBe('TestMake')
    expect(addedVehicle.model).toBe('TestModel')
    expect(addedVehicle.size).toBe('medium') // Default for unknown vehicles

    // Update vehicle
    const updatedVehicle = await vehicleService.updateVehicle(addedVehicle.id, {
      color: 'Red',
      year: 2021
    })
    expect(updatedVehicle.color).toBe('Red')
    expect(updatedVehicle.year).toBe(2021)

    // Get vehicle pricing
    const vehiclePricing = await vehicleService.getVehiclePricing(addedVehicle.id)
    expect(vehiclePricing.size).toBe('medium')
    expect(vehiclePricing.price_pence).toBe(6000)

    // Delete vehicle (soft delete)
    const deletedVehicle = await vehicleService.deleteVehicle(addedVehicle.id)
    expect(deletedVehicle.is_active).toBe(false)
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase
      .from('available_slots')
      .delete()
      .eq('id', testSlotId)

    // Clean up any test bookings
    await supabase
      .from('bookings')
      .delete()
      .in('customer_email', [
        'test@example.com',
        'fullflow@example.com', 
        'status-test@example.com',
        'cancel-test@example.com'
      ])

    // Clean up test vehicles
    await supabase
      .from('vehicles')
      .delete()
      .eq('registration', 'TESTCAR1')

    // Clean up unverified vehicle registry entries
    await supabase
      .from('vehicle_model_registry')
      .delete()
      .eq('verified', false)
      .in('make', ['UnknownMake', 'TestMake'])
  })
})

// Additional utility tests
describe('Service Layer Utilities', () => {
  let bookingService: BookingService
  let vehicleService: VehicleService

  beforeAll(() => {
    bookingService = new BookingService()
    vehicleService = new VehicleService()
  })

  test('Price formatting works correctly', () => {
    expect(bookingService.formatPrice(5000)).toBe('£50.00')
    expect(bookingService.formatPrice(6000)).toBe('£60.00')
    expect(bookingService.formatPrice(8500)).toBe('£85.00')
    expect(bookingService.formatPrice(99)).toBe('£0.99')
  })

  test('Vehicle size labels are correct', () => {
    expect(vehicleService.getSizeLabel('small')).toBe('Small Car')
    expect(vehicleService.getSizeLabel('medium')).toBe('Medium Car')
    expect(vehicleService.getSizeLabel('large')).toBe('Large Car')
    expect(vehicleService.getSizeLabel('extra_large')).toBe('Extra Large Vehicle')
  })

  test('Date time formatting works correctly', () => {
    const formatted = bookingService.formatDateTime('2024-01-15', '10:00:00')
    expect(formatted).toContain('Monday')
    expect(formatted).toContain('15')
    expect(formatted).toContain('January')
    expect(formatted).toContain('10:00')
  })

  test('Vehicle display formatting works correctly', () => {
    const vehicle = {
      id: 'test-id',
      user_id: 'user-id',
      registration: 'AB12CDE',
      make: 'Ford',
      model: 'Focus',
      year: 2020,
      color: 'Blue',
      size: 'medium' as const,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    const formatted = vehicleService.formatVehicleDisplay(vehicle)
    expect(formatted).toBe('Ford Focus (AB12CDE)')
  })
})