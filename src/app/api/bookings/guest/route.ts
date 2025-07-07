import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const GuestBookingSchema = z.object({
  serviceId: z.string().uuid(),
  slotId: z.string().uuid(),
  customerDetails: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    serviceAddress: z.string().min(10)
  }),
  vehicleData: z.object({
    registration: z.string().min(2),
    make: z.string().min(2),
    model: z.string().min(2),
    year: z.number().min(1950).max(new Date().getFullYear() + 1),
    color: z.string().min(2),
    size: z.enum(['small', 'medium', 'large', 'extra_large']),
    specialNotes: z.string().optional()
  }),
  totalPricePence: z.number().min(0)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = GuestBookingSchema.parse(body)

    const supabase = createRouteHandlerClient({ cookies })

    // Start a transaction to create booking, vehicle, and update slot
    const { data: result, error } = await supabase.rpc('create_guest_booking_transaction', {
      p_service_id: validatedData.serviceId,
      p_slot_id: validatedData.slotId,
      p_customer_name: validatedData.customerDetails.fullName,
      p_customer_email: validatedData.customerDetails.email,
      p_customer_phone: validatedData.customerDetails.phone,
      p_service_address: validatedData.customerDetails.serviceAddress,
      p_vehicle_data: {
        registration: validatedData.vehicleData.registration,
        make: validatedData.vehicleData.make,
        model: validatedData.vehicleData.model,
        year: validatedData.vehicleData.year,
        color: validatedData.vehicleData.color,
        size: validatedData.vehicleData.size,
        special_notes: validatedData.vehicleData.specialNotes || null
      },
      p_total_price_pence: validatedData.totalPricePence
    })

    if (error) {
      console.error('Booking creation error:', error)
      
      // Handle specific error cases
      if (error.message.includes('slot_not_available')) {
        return NextResponse.json(
          { error: 'Selected time slot is no longer available' },
          { status: 409 }
        )
      }
      
      if (error.message.includes('service_not_found')) {
        return NextResponse.json(
          { error: 'Selected service is not available' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Add a system note for the booking
    try {
      await supabase.rpc('add_booking_note', {
        p_booking_id: result.booking_id,
        p_author_id: null, // System note
        p_note_type: 'system',
        p_content: `Guest booking created for ${validatedData.customerDetails.fullName}. Vehicle: ${validatedData.vehicleData.year} ${validatedData.vehicleData.make} ${validatedData.vehicleData.model} (${validatedData.vehicleData.registration})`,
        p_visible_to_customer: false
      })
    } catch (noteError) {
      console.error('Failed to add booking note:', noteError)
      // Don't fail the booking for this
    }

    // Send confirmation email (you might want to queue this)
    try {
      const emailResponse = await fetch('/api/email/booking-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: result.booking_id,
          customerEmail: validatedData.customerDetails.email
        })
      })
      
      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email')
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the booking for email issues
    }

    return NextResponse.json({
      bookingId: result.booking_id,
      bookingReference: result.booking_reference,
      serviceDetails: {
        name: result.service_name,
        duration: result.duration_minutes,
        price: result.total_price_pence / 100
      },
      scheduledDateTime: result.scheduled_datetime,
      customerInstructions: result.customer_instructions || 'We will contact you 24 hours before your appointment to confirm details.',
      message: 'Booking created successfully'
    })

  } catch (error) {
    console.error('Guest booking error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}