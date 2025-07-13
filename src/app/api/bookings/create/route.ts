import { NextRequest, NextResponse } from 'next/server'
import { BookingProcedures } from '@/lib/database/procedures'
import EmailService, { BookingEmailData } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const transaction = await request.json()

    // Validate required fields
    if (!transaction.customer_data?.email || !transaction.vehicle_data?.registration || !transaction.booking_data?.slot_id) {
      return NextResponse.json(
        { error: 'Missing required booking data' },
        { status: 400 }
      )
    }

    const { data, error } = await BookingProcedures.processBookingTransaction(transaction)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Send booking confirmation emails if booking was successful
    if (data?.booking_id) {
      try {
        console.log('📧 Triggering booking confirmation emails for:', data.booking_id)
        
        // Prepare email data from booking transaction
        // Combine address and postcode for complete service location
        const serviceAddress = transaction.booking_data.service_address || transaction.booking_data.service_location || 'Customer address'
        const servicePostcode = transaction.booking_data.service_postcode || ''
        const completeServiceLocation = servicePostcode 
          ? `${serviceAddress}, ${servicePostcode}` 
          : serviceAddress

        const emailData: BookingEmailData = {
          booking_reference: data.booking_reference || `L4D-${Date.now()}`,
          customer_name: transaction.customer_data.full_name || 'Valued Customer',
          customer_email: transaction.customer_data.email,
          customer_phone: transaction.customer_data.phone || 'Not provided',
          service_name: transaction.booking_data.service_name || 'Car Detailing Service',
          service_date: transaction.booking_data.service_date || new Date().toISOString().split('T')[0],
          service_time: transaction.booking_data.service_time || '10:00',
          service_location: completeServiceLocation,
          vehicle_make: transaction.vehicle_data.make || 'Unknown',
          vehicle_model: transaction.vehicle_data.model || 'Vehicle',
          vehicle_registration: transaction.vehicle_data.registration,
          total_price_pence: transaction.pricing?.total_price_pence || 0,
          special_instructions: transaction.booking_data.special_instructions,
          admin_phone: process.env.ADMIN_PHONE || '07123 456789',
          admin_email: process.env.ADMIN_EMAIL || 'zell@love4detailing.com'
        }

        // Send confirmation emails (async, don't wait for completion)
        EmailService.sendBookingConfirmation(emailData).catch(emailError => {
          console.error('❌ Failed to send booking confirmation email:', emailError)
          // Don't fail the booking if email fails
        })

        console.log('✅ Booking confirmation email triggered successfully')
      } catch (emailError) {
        console.error('❌ Error preparing booking confirmation email:', emailError)
        // Don't fail the booking if email preparation fails
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}