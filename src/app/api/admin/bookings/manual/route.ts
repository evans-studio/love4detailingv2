import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST create manual booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 Creating manual booking:', body)

    const {
      admin_id,
      customer_data,
      vehicle_data,
      service_data,
      booking_settings,
      is_existing_customer = false,
      existing_customer_id = null,
      existing_vehicle_id = null,
      use_existing_vehicle = false
    } = body

    if (!admin_id) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }

    // Verify admin permissions
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', admin_id)
      .single()

    // Allow access if user_profiles table doesn't exist (initial setup) or user is admin
    if (profileError && !profileError.message.includes('does not exist')) {
      console.error('❌ Error fetching admin profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to verify admin permissions' },
        { status: 500 }
      )
    }

    if (adminProfile && !['admin', 'super_admin', 'staff'].includes(adminProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    let customerId = existing_customer_id
    let vehicleId = existing_vehicle_id
    let isNewUser = false
    let passwordSetupRequired = false

    // Handle customer creation/selection
    if (!is_existing_customer) {
      // Create new customer
      console.log('👤 Creating new customer account...')
      
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: customer_data.email,
        email_confirm: false, // We'll send password setup email instead
        user_metadata: {
          full_name: customer_data.full_name,
          phone: customer_data.phone,
          created_by_admin: true,
          admin_id: admin_id
        }
      })

      if (userError) {
        console.error('❌ Error creating user:', userError)
        return NextResponse.json(
          { error: 'Failed to create customer account: ' + userError.message },
          { status: 500 }
        )
      }

      customerId = newUser.user.id
      isNewUser = true
      passwordSetupRequired = true

      // Create user profile
      const { error: profileInsertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: customerId,
          full_name: customer_data.full_name,
          phone: customer_data.phone,
          role: 'customer',
          is_active: true,
          profile_complete: false,
          user_journey: 'admin-created',
          registration_date: new Date().toISOString()
        })

      if (profileInsertError) {
        console.warn('⚠️ Warning: Could not create user profile:', profileInsertError)
      }

      console.log('✅ New customer account created:', customerId)
    }

    let vehicle
    
    // Handle vehicle creation/selection
    if (use_existing_vehicle && existing_vehicle_id) {
      // Use existing vehicle
      console.log('🚗 Using existing vehicle:', existing_vehicle_id)
      
      const { data: existingVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', existing_vehicle_id)
        .eq('user_id', customerId)
        .single()

      if (vehicleError || !existingVehicle) {
        console.error('❌ Error fetching existing vehicle:', vehicleError)
        return NextResponse.json(
          { error: 'Failed to find selected vehicle' },
          { status: 500 }
        )
      }
      
      vehicle = existingVehicle
      vehicleId = existingVehicle.id
    } else {
      // Create new vehicle record
      console.log('🚗 Creating vehicle record...')
      const vehicleData = {
        user_id: customerId,
        registration: vehicle_data.registration.toUpperCase(),
        make: vehicle_data.make,
        model: vehicle_data.model,
        year: vehicle_data.year || new Date().getFullYear(),
        color: vehicle_data.color || null,
        size: vehicle_data.size || 'medium',
        size_confirmed: true,
        created_at: new Date().toISOString()
      }

      const { data: newVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert(vehicleData)
        .select()
        .single()

      if (vehicleError) {
        console.error('❌ Error creating vehicle:', vehicleError)
        return NextResponse.json(
          { error: 'Failed to create vehicle record: ' + vehicleError.message },
          { status: 500 }
        )
      }
      
      vehicle = newVehicle
      vehicleId = newVehicle.id
    }

    // Get pricing based on vehicle size
    const vehicleSize = use_existing_vehicle ? vehicle.size : vehicle_data.size
    const { data: sizeData, error: sizeError } = await supabase
      .from('vehicle_sizes')
      .select('*')
      .eq('size_category', vehicleSize)
      .single()

    const basePrice = sizeData?.base_price_pence || 7500 // Default £75.00

    // Generate booking reference
    const bookingReference = `L4D-${Date.now()}`

    // Create booking
    console.log('📅 Creating booking...')
    const bookingData = {
      user_id: customerId,
      vehicle_id: vehicle.id,
      booking_reference: bookingReference,
      service_date: service_data.date,
      service_time: service_data.time,
      service_name: 'Premium Detail Service',
      total_price_pence: basePrice,
      status: booking_settings.status || 'confirmed',
      payment_method: booking_settings.payment_method || 'cash',
      payment_status: 'pending',
      special_instructions: service_data.special_instructions || null,
      customer_data: {
        full_name: customer_data.full_name,
        email: customer_data.email,
        phone: customer_data.phone
      },
      service_data: {
        address: service_data.address,
        postcode: service_data.postcode || null,
        duration_minutes: 120,
        travel_time_minutes: 30
      },
      vehicle_data: {
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        size: vehicle.size
      },
      booking_source: 'admin_manual',
      created_by_admin: admin_id,
      created_at: new Date().toISOString()
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      console.error('❌ Error creating booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create booking: ' + bookingError.message },
        { status: 500 }
      )
    }

    // Send appropriate email
    try {
      const emailApiUrl = new URL('/api/emails/manual-booking', request.url)
      const emailResponse = await fetch(emailApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          customer_email: customer_data.email,
          customer_name: customer_data.full_name,
          booking_reference: bookingReference,
          service_date: service_data.date,
          service_time: service_data.time,
          service_address: service_data.address,
          vehicle_details: `${vehicle.make} ${vehicle.model}`,
          total_price: (basePrice / 100).toFixed(2),
          is_new_user: isNewUser,
          password_setup_required: passwordSetupRequired,
          user_id: customerId
        })
      })

      if (!emailResponse.ok) {
        console.warn('⚠️ Email sending failed, but booking was created successfully')
      }
    } catch (emailError) {
      console.warn('⚠️ Email sending error:', emailError)
    }

    console.log('✅ Manual booking created successfully:', {
      booking_id: booking.id,
      customer_id: customerId,
      is_new_user: isNewUser,
      password_setup_required: passwordSetupRequired
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        booking_reference: bookingReference,
        customer_id: customerId,
        vehicle_id: vehicle.id,
        service_date: service_data.date,
        service_time: service_data.time,
        total_price: (basePrice / 100).toFixed(2),
        status: booking.status
      },
      customer: {
        id: customerId,
        is_new_user: isNewUser,
        password_setup_required: passwordSetupRequired,
        email: customer_data.email,
        full_name: customer_data.full_name
      },
      message: isNewUser 
        ? 'Booking created successfully! Customer will receive an email with password setup instructions.'
        : 'Booking created successfully! Customer has been notified.'
    })

  } catch (error) {
    console.error('❌ Manual booking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}