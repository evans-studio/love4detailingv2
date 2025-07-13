import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUSINESS_NAME = 'Love4Detailing'
const SENDER_EMAIL = 'zell@love4detailing.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// POST send manual booking email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📧 Sending manual booking email:', body)

    const {
      booking_id,
      customer_email,
      customer_name,
      booking_reference,
      service_date,
      service_time,
      service_address,
      vehicle_details,
      total_price,
      is_new_user,
      password_setup_required,
      user_id
    } = body

    if (!customer_email || !booking_reference) {
      return NextResponse.json(
        { error: 'Customer email and booking reference required' },
        { status: 400 }
      )
    }

    let passwordSetupUrl = ''
    if (password_setup_required && user_id) {
      // Generate password reset link for new user
      const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: customer_email,
        options: {
          redirectTo: `${SITE_URL}/auth/setup-password?type=setup&email=${encodeURIComponent(customer_email)}`
        }
      })

      if (resetError) {
        console.error('❌ Error generating password setup link:', resetError)
      } else {
        passwordSetupUrl = resetData.properties?.action_link || ''
      }
    }

    // Format date and time
    const formattedDate = new Date(service_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const formattedTime = service_time

    // Create email content based on whether it's a new user or existing customer
    const subject = is_new_user 
      ? `Welcome to ${BUSINESS_NAME} - Your Booking is Confirmed`
      : `Booking Confirmed - ${booking_reference}`

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9747FF, #7C3AED); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e0e0e0; }
            .booking-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .password-setup { background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .cta-button { display: inline-block; background: #9747FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            @media (max-width: 600px) {
                .container { padding: 10px; }
                .detail-row { flex-direction: column; }
                .detail-label, .detail-value { margin: 5px 0; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">${BUSINESS_NAME}</div>
                <h1>${is_new_user ? 'Welcome!' : 'Booking Confirmed'}</h1>
                <p>${is_new_user ? 'Your account has been created and your booking is confirmed' : 'Your service has been scheduled'}</p>
            </div>
            
            <div class="content">
                ${is_new_user ? `
                <div class="password-setup">
                    <h3 style="color: #2196f3; margin-top: 0;">🔐 Account Setup Required</h3>
                    <p>We've created an account for you to manage your bookings and track your service history. Please set up your password to access your dashboard:</p>
                    ${passwordSetupUrl ? `
                    <p style="text-align: center;">
                        <a href="${passwordSetupUrl}" class="cta-button">Set Up Your Password</a>
                    </p>
                    ` : `
                    <p>You will receive a separate email with password setup instructions shortly.</p>
                    `}
                    <p><small>This link will expire in 24 hours for security reasons.</small></p>
                </div>
                ` : ''}
                
                <h2>Booking Details</h2>
                <div class="booking-details">
                    <div class="detail-row">
                        <span class="detail-label">Booking Reference:</span>
                        <span class="detail-value"><strong>${booking_reference}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Service Date:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Service Time:</span>
                        <span class="detail-value">${formattedTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Vehicle:</span>
                        <span class="detail-value">${vehicle_details}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Service Address:</span>
                        <span class="detail-value">${service_address}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total Price:</span>
                        <span class="detail-value"><strong>£${total_price}</strong></span>
                    </div>
                </div>

                <h3>What to Expect</h3>
                <ul>
                    <li><strong>Professional Service:</strong> Our team will arrive with all necessary equipment</li>
                    <li><strong>2-Hour Service:</strong> Complete interior and exterior detailing</li>
                    <li><strong>Quality Guaranteed:</strong> We ensure your complete satisfaction</li>
                    <li><strong>Water & Power:</strong> Please ensure access to water and electricity</li>
                </ul>

                <h3>Need to Make Changes?</h3>
                <p>If you need to reschedule or have questions about your booking:</p>
                <ul>
                    <li>Call us: <strong>020 1234 5678</strong></li>
                    <li>Email us: <strong>${SENDER_EMAIL}</strong></li>
                    ${!is_new_user ? '<li>Log in to your dashboard to manage bookings</li>' : ''}
                </ul>

                ${is_new_user ? `
                <div style="background: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #4caf50; margin-top: 0;">🎉 Welcome Benefits</h3>
                    <p>As a new customer, you'll automatically earn <strong>50 bonus points</strong> and join our loyalty program!</p>
                    <p>Once you set up your account, you can:</p>
                    <ul>
                        <li>Track your service history</li>
                        <li>Earn points with every booking</li>
                        <li>Get exclusive member discounts</li>
                        <li>Manage your vehicles and preferences</li>
                    </ul>
                </div>
                ` : ''}
            </div>
            
            <div class="footer">
                <p><strong>${BUSINESS_NAME}</strong><br>
                Premium Mobile Car Detailing</p>
                <p>This email was sent regarding your booking ${booking_reference}</p>
            </div>
        </div>
    </body>
    </html>
    `

    // Send email
    const emailResult = await resend.emails.send({
      from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
      to: customer_email,
      subject: subject,
      html: emailHtml
    })

    if (emailResult.error) {
      console.error('❌ Resend error:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send email: ' + emailResult.error.message },
        { status: 500 }
      )
    }

    // Log email notification
    try {
      await supabase.rpc('log_email_notification', {
        p_user_id: user_id,
        p_booking_id: booking_id,
        p_email_type: is_new_user ? 'welcome_booking' : 'booking_confirmation',
        p_email_address: customer_email,
        p_subject: subject,
        p_resend_message_id: emailResult.data?.id
      })
    } catch (logError) {
      console.warn('⚠️ Could not log email notification:', logError)
    }

    console.log('✅ Manual booking email sent successfully:', {
      email_id: emailResult.data?.id,
      customer_email,
      is_new_user,
      password_setup_required
    })

    return NextResponse.json({
      success: true,
      email_id: emailResult.data?.id,
      message: is_new_user 
        ? 'Welcome email with password setup sent successfully'
        : 'Booking confirmation email sent successfully'
    })

  } catch (error) {
    console.error('❌ Manual booking email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}