/**
 * Love4Detailing Email Service
 * Comprehensive transactional email automation using Resend API
 * Handles all customer communications and business automation
 */

import { Resend } from 'resend'

// Email service configuration
const resend = new Resend(process.env.RESEND_API_KEY)

// Email sender configuration
const SENDER_EMAIL = 'zell@love4detailing.com'
const BUSINESS_NAME = 'Love4Detailing'

// Email types for tracking and templates
export type EmailType = 
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_cancellation'
  | 'booking_rescheduling'
  | 'service_completion'
  | 'welcome_bonus'
  | 'points_earned'
  | 'tier_upgrade'
  | 'follow_up_reminder'

// Email notification data interfaces
export interface BookingEmailData {
  booking_reference: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service_name: string
  service_date: string
  service_time: string
  service_location: string
  vehicle_make: string
  vehicle_model: string
  vehicle_registration: string
  total_price_pence: number
  special_instructions?: string
  admin_phone?: string
  admin_email?: string
}

export interface LoyaltyEmailData {
  customer_name: string
  customer_email: string
  points_earned?: number
  total_points?: number
  tier?: string
  new_tier?: string
  tier_benefits?: string[]
}

export interface RescheduleEmailData extends BookingEmailData {
  old_service_date: string
  old_service_time: string
  reschedule_reason?: string
  request_id?: string
  admin_response?: string
  decision?: 'approved' | 'declined'
}

export interface CancellationEmailData extends BookingEmailData {
  cancellation_reason: string
  refund_amount?: number
  cancellation_policy?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Email Service Class
 * Handles all email operations including templates, sending, and tracking
 */
export class EmailService {
  /**
   * Send booking confirmation email to customer and admin
   */
  static async sendBookingConfirmation(data: BookingEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending booking confirmation email:', { 
        customer: data.customer_name, 
        booking: data.booking_reference 
      })

      const customerSubject = `Booking Confirmed - Your Love4Detailing Service`
      const adminSubject = `New Booking Received - ${data.customer_name}`

      // Send customer confirmation email
      const customerEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: customerSubject,
        html: this.generateBookingConfirmationTemplate(data, 'customer'),
      })

      // Send admin notification email
      const adminEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: SENDER_EMAIL,
        subject: adminSubject,
        html: this.generateBookingConfirmationTemplate(data, 'admin'),
      })

      // Log email tracking
      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'booking_confirmation',
        subject: customerSubject,
        booking_reference: data.booking_reference
      })

      console.log('✅ Booking confirmation emails sent successfully')
      return { 
        success: true, 
        messageId: customerEmail.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending booking confirmation email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send booking reminder email (24 hours before service)
   */
  static async sendBookingReminder(data: BookingEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending booking reminder email:', { 
        customer: data.customer_name, 
        booking: data.booking_reference 
      })

      const subject = `Reminder: Your Love4Detailing Service Tomorrow`

      const result = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: subject,
        html: this.generateBookingReminderTemplate(data),
      })

      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'booking_reminder',
        subject: subject,
        booking_reference: data.booking_reference
      })

      console.log('✅ Booking reminder email sent successfully')
      return { 
        success: true, 
        messageId: result.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending booking reminder email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send welcome bonus email to new customers
   */
  static async sendWelcomeBonus(data: LoyaltyEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending welcome bonus email:', { customer: data.customer_name })

      const subject = `Welcome to Love4Detailing! Your 50 Bonus Points Await`

      const result = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: subject,
        html: this.generateWelcomeBonusTemplate(data),
      })

      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'welcome_bonus',
        subject: subject
      })

      console.log('✅ Welcome bonus email sent successfully')
      return { 
        success: true, 
        messageId: result.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending welcome bonus email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send points earned notification
   */
  static async sendPointsEarned(data: LoyaltyEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending points earned email:', { 
        customer: data.customer_name, 
        points: data.points_earned 
      })

      const subject = `Points Earned! Thank You for Choosing Love4Detailing`

      const result = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: subject,
        html: this.generatePointsEarnedTemplate(data),
      })

      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'points_earned',
        subject: subject
      })

      console.log('✅ Points earned email sent successfully')
      return { 
        success: true, 
        messageId: result.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending points earned email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send tier upgrade celebration email
   */
  static async sendTierUpgrade(data: LoyaltyEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending tier upgrade email:', { 
        customer: data.customer_name, 
        tier: data.new_tier 
      })

      const subject = `Congratulations! You've Reached ${data.new_tier} Status`

      const result = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: subject,
        html: this.generateTierUpgradeTemplate(data),
      })

      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'tier_upgrade',
        subject: subject
      })

      console.log('✅ Tier upgrade email sent successfully')
      return { 
        success: true, 
        messageId: result.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending tier upgrade email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send booking cancellation email to customer and admin
   */
  static async sendBookingCancellation(data: CancellationEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending booking cancellation email:', { 
        customer: data.customer_name, 
        booking: data.booking_reference 
      })

      const customerSubject = `Booking Cancelled - ${data.booking_reference}`
      const adminSubject = `Booking Cancelled by Customer - ${data.customer_name}`

      // Send customer cancellation email
      const customerEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: customerSubject,
        html: this.generateBookingCancellationTemplate(data, 'customer'),
      })

      // Send admin notification email
      const adminEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: SENDER_EMAIL,
        subject: adminSubject,
        html: this.generateBookingCancellationTemplate(data, 'admin'),
      })

      // Log email tracking
      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'booking_cancellation',
        subject: customerSubject,
        booking_reference: data.booking_reference
      })

      console.log('✅ Booking cancellation emails sent successfully')
      return { 
        success: true, 
        messageId: customerEmail.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending booking cancellation email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send reschedule request email (customer confirmation + admin notification)
   */
  static async sendRescheduleRequest(data: RescheduleEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending reschedule request email:', { 
        customer: data.customer_name, 
        booking: data.booking_reference 
      })

      const customerSubject = `Reschedule Request Submitted - ${data.booking_reference}`
      const adminSubject = `Reschedule Request from ${data.customer_name} - ${data.booking_reference}`

      // Send customer confirmation email
      const customerEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: customerSubject,
        html: this.generateRescheduleRequestTemplate(data, 'customer'),
      })

      // Send admin notification email
      const adminEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: SENDER_EMAIL,
        subject: adminSubject,
        html: this.generateRescheduleRequestTemplate(data, 'admin'),
      })

      // Log email tracking
      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'booking_rescheduling',
        subject: customerSubject,
        booking_reference: data.booking_reference
      })

      console.log('✅ Reschedule request emails sent successfully')
      return { 
        success: true, 
        messageId: customerEmail.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending reschedule request email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send reschedule approved email to customer
   */
  static async sendRescheduleApproved(data: RescheduleEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending reschedule approved email:', { 
        customer: data.customer_name, 
        booking: data.booking_reference 
      })

      const subject = `Reschedule Approved - ${data.booking_reference}`

      const result = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: subject,
        html: this.generateRescheduleApprovedTemplate(data),
      })

      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'booking_rescheduling',
        subject: subject,
        booking_reference: data.booking_reference
      })

      console.log('✅ Reschedule approved email sent successfully')
      return { 
        success: true, 
        messageId: result.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending reschedule approved email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send reschedule declined email to customer
   */
  static async sendRescheduleDeclined(data: RescheduleEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending reschedule declined email:', { 
        customer: data.customer_name, 
        booking: data.booking_reference 
      })

      const subject = `Reschedule Request Update - ${data.booking_reference}`

      const result = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: subject,
        html: this.generateRescheduleDeclinedTemplate(data),
      })

      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'booking_rescheduling',
        subject: subject,
        booking_reference: data.booking_reference
      })

      console.log('✅ Reschedule declined email sent successfully')
      return { 
        success: true, 
        messageId: result.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending reschedule declined email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send booking reschedule email to customer and admin
   */
  static async sendBookingReschedule(data: RescheduleEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending booking reschedule email:', { 
        customer: data.customer_name, 
        booking: data.booking_reference 
      })

      const customerSubject = `Booking Rescheduled - ${data.booking_reference}`
      const adminSubject = `Booking Rescheduled by Customer - ${data.customer_name}`

      // Send customer reschedule email
      const customerEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: data.customer_email,
        subject: customerSubject,
        html: this.generateBookingRescheduleTemplate(data, 'customer'),
      })

      // Send admin notification email
      const adminEmail = await resend.emails.send({
        from: `${BUSINESS_NAME} <${SENDER_EMAIL}>`,
        to: SENDER_EMAIL,
        subject: adminSubject,
        html: this.generateBookingRescheduleTemplate(data, 'admin'),
      })

      // Log email tracking
      await this.logEmailNotification({
        user_email: data.customer_email,
        email_type: 'booking_rescheduling',
        subject: customerSubject,
        booking_reference: data.booking_reference
      })

      console.log('✅ Booking reschedule emails sent successfully')
      return { 
        success: true, 
        messageId: customerEmail.data?.id 
      }

    } catch (error) {
      console.error('❌ Error sending booking reschedule email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Generate booking confirmation email template
   */
  private static generateBookingConfirmationTemplate(data: BookingEmailData, recipient: 'customer' | 'admin'): string {
    const priceFormatted = `£${(data.total_price_pence / 100).toFixed(2)}`
    
    if (recipient === 'customer') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmed - Love4Detailing</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #9747FF 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .booking-details { background-color: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #9747FF; }
            .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .detail-label { font-weight: 600; color: #495057; }
            .detail-value { color: #212529; }
            .cta-button { display: inline-block; background-color: #9747FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; }
            .instructions { background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
            @media (max-width: 600px) { .container { margin: 0; } .content, .header { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚗 Love4Detailing</div>
              <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Your premium car detailing service is scheduled</p>
            </div>
            
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for choosing Love4Detailing! Your booking has been confirmed and we're excited to provide you with exceptional car detailing service.</p>
              
              <div class="booking-details">
                <h3 style="margin-top: 0; color: #9747FF;">📋 Booking Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Booking Reference:</span>
                  <span class="detail-value"><strong>${data.booking_reference}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Date:</span>
                  <span class="detail-value">${data.service_date}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Time:</span>
                  <span class="detail-value">${data.service_time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Type:</span>
                  <span class="detail-value">${data.service_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total Cost:</span>
                  <span class="detail-value"><strong>${priceFormatted}</strong></span>
                </div>
              </div>

              <div class="booking-details">
                <h3 style="margin-top: 0; color: #9747FF;">🚗 Vehicle Information</h3>
                <div class="detail-row">
                  <span class="detail-label">Vehicle:</span>
                  <span class="detail-value">${data.vehicle_make} ${data.vehicle_model}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Registration:</span>
                  <span class="detail-value">${data.vehicle_registration}</span>
                </div>
              </div>

              <div class="booking-details">
                <h3 style="margin-top: 0; color: #9747FF;">📍 Service Location</h3>
                <p style="margin: 0;">${data.service_location}</p>
              </div>

              ${data.special_instructions ? `
              <div class="booking-details">
                <h3 style="margin-top: 0; color: #9747FF;">📝 Special Instructions</h3>
                <p style="margin: 0;">${data.special_instructions}</p>
              </div>
              ` : ''}

              <div class="instructions">
                <h3 style="margin-top: 0; color: #0066cc;">🛠️ Preparation Instructions</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Please ensure your vehicle is accessible at the scheduled time</li>
                  <li>Remove all personal belongings from the vehicle</li>
                  <li>Provide access to water and electricity if possible</li>
                  <li>Our team will arrive within the scheduled time window</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://love4detailing.com/dashboard/bookings" class="cta-button">View Booking Details</a>
              </div>

              <p><strong>Need to make changes?</strong><br>
              Contact us at least 24 hours before your service:<br>
              📞 Phone: ${data.admin_phone || process.env.ADMIN_PHONE || '07123 456789'}<br>
              📧 Email: ${data.admin_email || SENDER_EMAIL}</p>

              <p>We look forward to making your vehicle shine!</p>
              
              <p>Best regards,<br>
              <strong>The Love4Detailing Team</strong></p>
            </div>
            
            <div class="footer">
              <p>Love4Detailing - Premium Mobile Car Detailing</p>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p><a href="mailto:${SENDER_EMAIL}" style="color: #9747FF;">Contact Support</a> | 
                 <a href="https://love4detailing.com/privacy" style="color: #9747FF;">Privacy Policy</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      // Admin notification template
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Booking - Admin Notification</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .booking-summary { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 4px 0; border-bottom: 1px solid #e9ecef; }
            .urgent { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚨 New Booking Alert</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Customer: ${data.customer_name}</p>
            </div>
            
            <div class="content">
              <div class="urgent">
                <strong>⏰ Action Required:</strong> New booking requires confirmation and scheduling preparation.
              </div>

              <div class="booking-summary">
                <h3 style="margin-top: 0; color: #dc3545;">📋 Booking Summary</h3>
                <div class="detail-row">
                  <span><strong>Reference:</strong></span>
                  <span>${data.booking_reference}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Customer:</strong></span>
                  <span>${data.customer_name}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Phone:</strong></span>
                  <span>${data.customer_phone}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Email:</strong></span>
                  <span>${data.customer_email}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${data.service_name}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date & Time:</strong></span>
                  <span>${data.service_date} at ${data.service_time}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Vehicle:</strong></span>
                  <span>${data.vehicle_make} ${data.vehicle_model} (${data.vehicle_registration})</span>
                </div>
                <div class="detail-row">
                  <span><strong>Location:</strong></span>
                  <span>${data.service_location}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Revenue:</strong></span>
                  <span><strong>${priceFormatted}</strong></span>
                </div>
              </div>

              ${data.special_instructions ? `
              <div class="booking-summary">
                <h3 style="margin-top: 0; color: #dc3545;">📝 Special Instructions</h3>
                <p style="margin: 0;">${data.special_instructions}</p>
              </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://love4detailing.com/admin/bookings" 
                   style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                   View in Admin Dashboard
                </a>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Confirm booking in admin dashboard</li>
                <li>Add to calendar and route planning</li>
                <li>Prepare equipment for service type</li>
                <li>Contact customer if clarification needed</li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Generate booking reminder email template
   */
  private static generateBookingReminderTemplate(data: BookingEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Reminder - Love4Detailing</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%); color: #212529; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .reminder-box { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
          .checklist { background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .cta-button { display: inline-block; background-color: #ffc107; color: #212529; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
            <h1 style="margin: 0; font-size: 24px;">Service Reminder</h1>
            <p style="margin: 10px 0 0;">Your Love4Detailing service is tomorrow!</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.customer_name},</h2>
            
            <div class="reminder-box">
              <h3 style="margin-top: 0; color: #856404;">🚗 Your service is scheduled for:</h3>
              <p style="font-size: 18px; font-weight: bold; margin: 10px 0;">
                ${data.service_date} at ${data.service_time}
              </p>
              <p style="margin: 0;">
                ${data.service_name} for ${data.vehicle_make} ${data.vehicle_model}
              </p>
            </div>

            <div class="checklist">
              <h3 style="margin-top: 0; color: #0066cc;">✅ Pre-Service Checklist</h3>
              <ul style="text-align: left; margin: 15px 0; padding-left: 20px;">
                <li>Move your vehicle to an accessible location</li>
                <li>Remove all personal belongings from the car</li>
                <li>Ensure water and power access are available</li>
                <li>Clear any obstacles around the vehicle</li>
                <li>Have your phone available for our arrival call</li>
              </ul>
            </div>

            <p><strong>Service Location:</strong><br>
            ${data.service_location}</p>

            <p><strong>Weather Considerations:</strong><br>
            Our team monitors weather conditions and will contact you if any adjustments are needed for optimal service quality.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://love4detailing.com/dashboard/bookings" class="cta-button">View Booking Details</a>
            </div>

            <p><strong>Need to reschedule?</strong><br>
            Please contact us as soon as possible:<br>
            📞 ${data.admin_phone || '07123 456789'}<br>
            📧 ${data.admin_email || SENDER_EMAIL}</p>

            <p>We're excited to make your ${data.vehicle_make} ${data.vehicle_model} shine tomorrow!</p>
            
            <p>Best regards,<br>
            <strong>The Love4Detailing Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate welcome bonus email template
   */
  private static generateWelcomeBonusTemplate(data: LoyaltyEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Love4Detailing</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .points-box { background: linear-gradient(135deg, #9747FF 0%, #7C3AED 100%); color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
          .benefits-list { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .cta-button { display: inline-block; background-color: #28a745; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <h1 style="margin: 0; font-size: 24px;">Welcome to Love4Detailing!</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Your premium car care journey starts here</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.customer_name},</h2>
            
            <p>Welcome to the Love4Detailing family! We're thrilled to have you join our community of car enthusiasts who demand nothing but the best for their vehicles.</p>

            <div class="points-box">
              <h3 style="margin-top: 0; font-size: 20px;">🎁 Welcome Bonus</h3>
              <div style="font-size: 36px; font-weight: bold; margin: 15px 0;">50 Points</div>
              <p style="margin: 0; opacity: 0.9;">Have been added to your account!</p>
              <p style="margin: 10px 0 0; font-size: 14px;">Worth £5.00 towards your next service</p>
            </div>

            <div class="benefits-list">
              <h3 style="margin-top: 0; color: #9747FF;">🏆 Loyalty Program Benefits</h3>
              <ul style="margin: 15px 0; padding-left: 20px;">
                <li><strong>Earn Points:</strong> Get 10 points for every £1 spent</li>
                <li><strong>Bronze Tier:</strong> 5% discount on services</li>
                <li><strong>Silver Tier:</strong> 10% discount + priority booking</li>
                <li><strong>Gold Tier:</strong> 15% discount + exclusive services</li>
                <li><strong>Platinum Tier:</strong> 20% discount + VIP treatment</li>
              </ul>
            </div>

            <p><strong>Your Points Value:</strong><br>
            • 50 points = £5.00 discount<br>
            • 100 points = £10.00 discount<br>
            • Points never expire and always add up!</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://love4detailing.com/booking" class="cta-button">Book Your First Service</a>
            </div>

            <p><strong>Ready to get started?</strong><br>
            Use your welcome points on your first booking and experience why Love4Detailing is the premier choice for mobile car detailing.</p>

            <p><strong>Need help?</strong><br>
            Our team is here to assist you:<br>
            📧 ${SENDER_EMAIL}<br>
            🌐 <a href="https://love4detailing.com/dashboard" style="color: #9747FF;">Access Your Dashboard</a></p>

            <p>Thank you for choosing Love4Detailing. We can't wait to make your vehicle shine!</p>
            
            <p>Best regards,<br>
            <strong>The Love4Detailing Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate points earned email template
   */
  private static generatePointsEarnedTemplate(data: LoyaltyEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Points Earned - Love4Detailing</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #9747FF 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .points-summary { background-color: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #9747FF; }
          .cta-button { display: inline-block; background-color: #9747FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">⭐</div>
            <h1 style="margin: 0; font-size: 24px;">Points Earned!</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Thank you for your loyalty</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.customer_name},</h2>
            
            <p>Thank you for choosing Love4Detailing for your recent car detailing service! We hope you're delighted with the results.</p>

            <div class="points-summary">
              <h3 style="margin-top: 0; color: #9747FF;">🎁 Points Update</h3>
              <div style="display: flex; justify-content: space-between; margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: 600;">Points Earned:</span>
                <span style="font-size: 18px; font-weight: bold; color: #28a745;">+${data.points_earned}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 15px 0; padding: 10px 0;">
                <span style="font-weight: 600;">Total Points:</span>
                <span style="font-size: 18px; font-weight: bold; color: #9747FF;">${data.total_points}</span>
              </div>
              <p style="margin: 15px 0 0; font-size: 14px; color: #6c757d;">
                Your points are worth £${((data.total_points || 0) / 10).toFixed(2)} in discounts!
              </p>
            </div>

            <p><strong>Keep earning points with every service:</strong></p>
            <ul>
              <li>Book your next detailing service</li>
              <li>Refer friends and family</li>
              <li>Try our premium services</li>
              <li>Leave reviews and feedback</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://love4detailing.com/booking" class="cta-button">Book Your Next Service</a>
            </div>

            <p><strong>Enjoying our service?</strong><br>
            We'd love to hear about your experience! Your feedback helps us continue providing exceptional service.</p>

            <p>Thank you for being a valued Love4Detailing customer!</p>
            
            <p>Best regards,<br>
            <strong>The Love4Detailing Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate tier upgrade email template
   */
  private static generateTierUpgradeTemplate(data: LoyaltyEmailData): string {
    const tierEmoji = {
      'Silver': '🥈',
      'Gold': '🥇', 
      'Platinum': '💎'
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tier Upgrade - Love4Detailing</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #ffd700 0%, #ffb300 100%); color: #212529; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .tier-announcement { background: linear-gradient(135deg, #9747FF 0%, #7C3AED 100%); color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
          .benefits-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .cta-button { display: inline-block; background-color: #ffd700; color: #212529; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">🎊</div>
            <h1 style="margin: 0; font-size: 24px;">Congratulations!</h1>
            <p style="margin: 10px 0 0;">You've reached ${data.new_tier} status</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.customer_name},</h2>
            
            <p>We're thrilled to congratulate you on reaching a major milestone in your Love4Detailing journey!</p>

            <div class="tier-announcement">
              <div style="font-size: 64px; margin-bottom: 15px;">
                ${tierEmoji[data.new_tier as keyof typeof tierEmoji] || '🏆'}
              </div>
              <h3 style="margin: 0; font-size: 24px;">Welcome to ${data.new_tier} Status!</h3>
              <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">
                You've earned ${data.total_points} loyalty points
              </p>
            </div>

            <div class="benefits-box">
              <h3 style="margin-top: 0; color: #9747FF;">🎁 Your New ${data.new_tier} Benefits</h3>
              ${data.tier_benefits ? `
                <ul style="margin: 15px 0; padding-left: 20px;">
                  ${data.tier_benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                </ul>
              ` : `
                <ul style="margin: 15px 0; padding-left: 20px;">
                  <li>Enhanced service discounts</li>
                  <li>Priority booking access</li>
                  <li>Exclusive ${data.new_tier} member offers</li>
                  <li>VIP customer support</li>
                </ul>
              `}
            </div>

            <p><strong>What this means for you:</strong></p>
            <ul>
              <li>Immediate access to all ${data.new_tier} tier benefits</li>
              <li>Enhanced discounts on all services</li>
              <li>Priority booking and scheduling</li>
              <li>Exclusive offers and promotions</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://love4detailing.com/dashboard/rewards" class="cta-button">View Your Rewards</a>
            </div>

            <p><strong>Keep climbing!</strong><br>
            Continue earning points with every service to unlock even more exclusive benefits and reach the next tier.</p>

            <p>Thank you for your continued loyalty and trust in Love4Detailing!</p>
            
            <p>Best regards,<br>
            <strong>The Love4Detailing Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate booking cancellation email template
   */
  private static generateBookingCancellationTemplate(data: CancellationEmailData, recipient: 'customer' | 'admin'): string {
    const priceFormatted = `£${(data.total_price_pence / 100).toFixed(2)}`
    const refundText = data.refund_amount ? `£${(data.refund_amount / 100).toFixed(2)}` : priceFormatted
    
    if (recipient === 'customer') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancelled - Love4Detailing</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .cancellation-details { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .detail-label { font-weight: 600; color: #495057; }
            .detail-value { color: #212529; }
            .refund-info { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
              <h1 style="margin: 0; font-size: 24px;">Booking Cancelled</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">We're sorry to see your booking cancelled</p>
            </div>
            
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Your booking has been successfully cancelled as requested. We understand that plans can change and we appreciate you letting us know in advance.</p>
              
              <div class="cancellation-details">
                <h3 style="margin-top: 0; color: #dc3545;">📋 Cancelled Booking Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Booking Reference:</span>
                  <span class="detail-value"><strong>${data.booking_reference}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Date:</span>
                  <span class="detail-value">${data.service_date}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Time:</span>
                  <span class="detail-value">${data.service_time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Type:</span>
                  <span class="detail-value">${data.service_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Vehicle:</span>
                  <span class="detail-value">${data.vehicle_make} ${data.vehicle_model} (${data.vehicle_registration})</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Cancellation Reason:</span>
                  <span class="detail-value">${data.cancellation_reason}</span>
                </div>
              </div>

              <div class="refund-info">
                <h3 style="margin-top: 0; color: #0c5460;">💳 Refund Information</h3>
                <p><strong>Refund Amount:</strong> ${refundText}</p>
                <p><strong>Processing Time:</strong> Refunds are typically processed within 3-5 business days</p>
                <p><strong>Payment Method:</strong> Refund will be issued to your original payment method</p>
              </div>

              <p><strong>We're here if you need us:</strong><br>
              If you have any questions about your cancellation or refund, please don't hesitate to contact us:<br>
              📞 Phone: ${data.admin_phone || process.env.ADMIN_PHONE || '07123 456789'}<br>
              📧 Email: ${data.admin_email || SENDER_EMAIL}</p>

              <p><strong>We hope to serve you again soon!</strong><br>
              When you're ready to book another service, we'll be here to make your vehicle shine.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://love4detailing.com/booking" 
                   style="display: inline-block; background-color: #9747FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                   Book a New Service
                </a>
              </div>
              
              <p>Thank you for choosing Love4Detailing.</p>
              
              <p>Best regards,<br>
              <strong>The Love4Detailing Team</strong></p>
            </div>
            
            <div class="footer">
              <p>Love4Detailing - Premium Mobile Car Detailing</p>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p><a href="mailto:${SENDER_EMAIL}" style="color: #9747FF;">Contact Support</a> | 
                 <a href="https://love4detailing.com/privacy" style="color: #9747FF;">Privacy Policy</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      // Admin notification template
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancelled - Admin Notification</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .cancellation-summary { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 4px 0; border-bottom: 1px solid #e9ecef; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">❌ Booking Cancelled</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Customer: ${data.customer_name}</p>
            </div>
            
            <div class="content">
              <div class="cancellation-summary">
                <h3 style="margin-top: 0; color: #dc3545;">📋 Cancellation Summary</h3>
                <div class="detail-row">
                  <span><strong>Reference:</strong></span>
                  <span>${data.booking_reference}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Customer:</strong></span>
                  <span>${data.customer_name} (${data.customer_email})</span>
                </div>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${data.service_name}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Cancelled Date:</strong></span>
                  <span>${data.service_date} at ${data.service_time}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Revenue Loss:</strong></span>
                  <span><strong>${priceFormatted}</strong></span>
                </div>
                <div class="detail-row">
                  <span><strong>Reason:</strong></span>
                  <span>${data.cancellation_reason}</span>
                </div>
              </div>

              <p><strong>Action Required:</strong></p>
              <ul>
                <li>Process refund: ${refundText}</li>
                <li>Update schedule and make time slot available</li>
                <li>Consider follow-up for rebooking</li>
                <li>Update revenue projections</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://love4detailing.com/admin/bookings" 
                   style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                   View Admin Dashboard
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Generate booking reschedule email template
   */
  private static generateBookingRescheduleTemplate(data: RescheduleEmailData, recipient: 'customer' | 'admin'): string {
    const priceFormatted = `£${(data.total_price_pence / 100).toFixed(2)}`
    
    if (recipient === 'customer') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Rescheduled - Love4Detailing</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .reschedule-details { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .old-time { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; }
            .new-time { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; }
            .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .detail-label { font-weight: 600; color: #495057; }
            .detail-value { color: #212529; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 48px; margin-bottom: 10px;">🔄</div>
              <h1 style="margin: 0; font-size: 24px;">Booking Rescheduled</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Your service has been moved to a new date and time</p>
            </div>
            
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Your booking has been successfully rescheduled as requested. We've updated your appointment to the new date and time below.</p>
              
              <div class="old-time">
                <h4 style="margin: 0 0 10px; color: #721c24;">❌ Previous Appointment</h4>
                <p style="margin: 0; font-size: 16px;"><strong>${data.old_service_date} at ${data.old_service_time}</strong></p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <div style="font-size: 24px;">⬇️</div>
              </div>

              <div class="new-time">
                <h4 style="margin: 0 0 10px; color: #155724;">✅ New Appointment</h4>
                <p style="margin: 0; font-size: 18px; font-weight: bold;">${data.service_date} at ${data.service_time}</p>
              </div>
              
              <div class="reschedule-details">
                <h3 style="margin-top: 0; color: #17a2b8;">📋 Booking Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Booking Reference:</span>
                  <span class="detail-value"><strong>${data.booking_reference}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Type:</span>
                  <span class="detail-value">${data.service_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Vehicle:</span>
                  <span class="detail-value">${data.vehicle_make} ${data.vehicle_model} (${data.vehicle_registration})</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service Location:</span>
                  <span class="detail-value">${data.service_location}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total Cost:</span>
                  <span class="detail-value"><strong>${priceFormatted}</strong></span>
                </div>
                ${data.reschedule_reason ? `
                <div class="detail-row">
                  <span class="detail-label">Reason for Change:</span>
                  <span class="detail-value">${data.reschedule_reason}</span>
                </div>
                ` : ''}
              </div>

              <div style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0066cc;">📝 Please Note</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Your new appointment is confirmed for ${data.service_date} at ${data.service_time}</li>
                  <li>Please ensure your vehicle is accessible at the new time</li>
                  <li>All other booking details remain the same</li>
                  <li>You'll receive a reminder 24 hours before your service</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://love4detailing.com/dashboard/bookings" 
                   style="display: inline-block; background-color: #17a2b8; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                   View Booking Details
                </a>
              </div>

              <p><strong>Need to make another change?</strong><br>
              Contact us at least 24 hours before your service:<br>
              📞 Phone: ${data.admin_phone || process.env.ADMIN_PHONE || '07123 456789'}<br>
              📧 Email: ${data.admin_email || SENDER_EMAIL}</p>

              <p>Thank you for your flexibility and we look forward to serving you at the new time!</p>
              
              <p>Best regards,<br>
              <strong>The Love4Detailing Team</strong></p>
            </div>
            
            <div class="footer">
              <p>Love4Detailing - Premium Mobile Car Detailing</p>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p><a href="mailto:${SENDER_EMAIL}" style="color: #9747FF;">Contact Support</a> | 
                 <a href="https://love4detailing.com/privacy" style="color: #9747FF;">Privacy Policy</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      // Admin notification template
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Rescheduled - Admin Notification</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .reschedule-summary { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 4px 0; border-bottom: 1px solid #e9ecef; }
            .time-change { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔄 Booking Rescheduled</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Customer: ${data.customer_name}</p>
            </div>
            
            <div class="content">
              <div class="time-change">
                <strong>⏰ Schedule Change:</strong><br>
                <span style="color: #856404;">From: ${data.old_service_date} at ${data.old_service_time}</span><br>
                <span style="color: #155724;"><strong>To: ${data.service_date} at ${data.service_time}</strong></span>
              </div>

              <div class="reschedule-summary">
                <h3 style="margin-top: 0; color: #17a2b8;">📋 Reschedule Summary</h3>
                <div class="detail-row">
                  <span><strong>Reference:</strong></span>
                  <span>${data.booking_reference}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Customer:</strong></span>
                  <span>${data.customer_name} (${data.customer_email})</span>
                </div>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${data.service_name}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Vehicle:</strong></span>
                  <span>${data.vehicle_make} ${data.vehicle_model} (${data.vehicle_registration})</span>
                </div>
                <div class="detail-row">
                  <span><strong>Revenue:</strong></span>
                  <span><strong>${priceFormatted}</strong></span>
                </div>
                ${data.reschedule_reason ? `
                <div class="detail-row">
                  <span><strong>Reason:</strong></span>
                  <span>${data.reschedule_reason}</span>
                </div>
                ` : ''}
              </div>

              <p><strong>Action Required:</strong></p>
              <ul>
                <li>Update schedule and route planning for new time</li>
                <li>Ensure team availability for ${data.service_date}</li>
                <li>Confirm equipment preparation</li>
                <li>Note customer reschedule preference for future reference</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://love4detailing.com/admin/schedule" 
                   style="display: inline-block; background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                   Update Schedule
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Generate reschedule request email template
   */
  private static generateRescheduleRequestTemplate(data: RescheduleEmailData, recipient: 'customer' | 'admin'): string {
    const priceFormatted = `£${(data.total_price_pence / 100).toFixed(2)}`
    
    if (recipient === 'customer') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reschedule Request Submitted - Love4Detailing</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .request-details { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .detail-label { font-weight: 600; color: #495057; }
            .detail-value { color: #212529; }
            .status-info { background-color: #cce5ff; border: 1px solid #99d6ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
              <h1 style="margin: 0; font-size: 24px;">Reschedule Request Submitted</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">We'll review your request shortly</p>
            </div>
            
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for submitting your reschedule request. We've received your request to change your booking time and will review it as soon as possible.</p>
              
              <div class="request-details">
                <h3 style="margin-top: 0; color: #856404;">📋 Reschedule Request Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Booking Reference:</span>
                  <span class="detail-value"><strong>${data.booking_reference}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Current Date & Time:</span>
                  <span class="detail-value">${data.old_service_date} at ${data.old_service_time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Requested Date & Time:</span>
                  <span class="detail-value"><strong>${data.service_date} at ${data.service_time}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">${data.service_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Vehicle:</span>
                  <span class="detail-value">${data.vehicle_make} ${data.vehicle_model} (${data.vehicle_registration})</span>
                </div>
                ${data.reschedule_reason ? `
                <div class="detail-row">
                  <span class="detail-label">Reason:</span>
                  <span class="detail-value">${data.reschedule_reason}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="status-info">
                <h3 style="margin-top: 0; color: #0066cc;">⏳ What happens next?</h3>
                <p style="margin-bottom: 0;">Our team will review your reschedule request and get back to you within 24 hours. You'll receive an email notification once we've made a decision.</p>
              </div>
              
              <p>If you have any questions or need to make changes to this request, please contact us directly.</p>
              
              <p>Thank you for choosing Love4Detailing!</p>
            </div>
            
            <div class="footer">
              <p><strong>Love4Detailing</strong><br>
              Premium Mobile Car Detailing Service<br>
              📞 Contact us if you need assistance</p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      // Admin notification
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Reschedule Request - Love4Detailing Admin</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ffc107; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; border: 1px solid #ddd; }
            .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .details { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Reschedule Request</h1>
            </div>
            <div class="content">
              <div class="alert">
                <strong>Action Required:</strong> A customer has submitted a reschedule request that needs your review.
              </div>
              
              <div class="details">
                <h3>Customer Details:</h3>
                <p><strong>Name:</strong> ${data.customer_name}<br>
                <strong>Email:</strong> ${data.customer_email}<br>
                <strong>Phone:</strong> ${data.customer_phone}</p>
                
                <h3>Booking Details:</h3>
                <p><strong>Reference:</strong> ${data.booking_reference}<br>
                <strong>Service:</strong> ${data.service_name}<br>
                <strong>Vehicle:</strong> ${data.vehicle_make} ${data.vehicle_model} (${data.vehicle_registration})<br>
                <strong>Location:</strong> ${data.service_location}</p>
                
                <h3>Reschedule Request:</h3>
                <p><strong>Current Date & Time:</strong> ${data.old_service_date} at ${data.old_service_time}<br>
                <strong>Requested Date & Time:</strong> ${data.service_date} at ${data.service_time}</p>
                ${data.reschedule_reason ? `<p><strong>Reason:</strong> ${data.reschedule_reason}</p>` : ''}
              </div>
              
              <p>Please log in to the admin dashboard to approve or decline this reschedule request.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Generate reschedule approved email template
   */
  private static generateRescheduleApprovedTemplate(data: RescheduleEmailData): string {
    const priceFormatted = `£${(data.total_price_pence / 100).toFixed(2)}`
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reschedule Approved - Love4Detailing</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .approved-details { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
          .detail-label { font-weight: 600; color: #495057; }
          .detail-value { color: #212529; }
          .success-info { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h1 style="margin: 0; font-size: 24px;">Reschedule Approved!</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Your booking has been successfully rescheduled</p>
          </div>
          
          <div class="content">
            <h2>Great news, ${data.customer_name}!</h2>
            <p>We're pleased to confirm that your reschedule request has been approved. Your booking has been successfully moved to your preferred date and time.</p>
            
            <div class="approved-details">
              <h3 style="margin-top: 0; color: #155724;">📅 Updated Booking Details</h3>
              <div class="detail-row">
                <span class="detail-label">Booking Reference:</span>
                <span class="detail-value"><strong>${data.booking_reference}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">New Date & Time:</span>
                <span class="detail-value"><strong>${data.service_date} at ${data.service_time}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${data.service_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Vehicle:</span>
                <span class="detail-value">${data.vehicle_make} ${data.vehicle_model} (${data.vehicle_registration})</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${data.service_location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total:</span>
                <span class="detail-value"><strong>${priceFormatted}</strong></span>
              </div>
            </div>
            
            ${data.admin_response ? `
            <div class="success-info">
              <h3 style="margin-top: 0; color: #0c5460;">💬 Message from our team:</h3>
              <p style="margin-bottom: 0;">${data.admin_response}</p>
            </div>
            ` : ''}
            
            <p>We look forward to providing you with exceptional car detailing service at your new appointment time. As always, we'll send you a reminder 24 hours before your service.</p>
            
            <p>Thank you for choosing Love4Detailing!</p>
          </div>
          
          <div class="footer">
            <p><strong>Love4Detailing</strong><br>
            Premium Mobile Car Detailing Service<br>
            📞 Contact us if you need any assistance</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate reschedule declined email template
   */
  private static generateRescheduleDeclinedTemplate(data: RescheduleEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reschedule Request Update - Love4Detailing</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .declined-details { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
          .detail-label { font-weight: 600; color: #495057; }
          .detail-value { color: #212529; }
          .alternative-info { background-color: #cce5ff; border: 1px solid #99d6ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
            <h1 style="margin: 0; font-size: 24px;">Reschedule Request Update</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">We've reviewed your request</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.customer_name},</h2>
            <p>Thank you for your patience while we reviewed your reschedule request. Unfortunately, we're unable to accommodate the requested time change for the following reason:</p>
            
            <div class="declined-details">
              <h3 style="margin-top: 0; color: #721c24;">📅 Reschedule Request Details</h3>
              <div class="detail-row">
                <span class="detail-label">Booking Reference:</span>
                <span class="detail-value"><strong>${data.booking_reference}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Current Date & Time:</span>
                <span class="detail-value">${data.old_service_date} at ${data.old_service_time}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Requested Date & Time:</span>
                <span class="detail-value">${data.service_date} at ${data.service_time}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${data.service_name}</span>
              </div>
              
              ${data.admin_response ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f5c6cb;">
                <h4 style="margin-top: 0; color: #721c24;">Reason for decline:</h4>
                <p style="margin-bottom: 0;">${data.admin_response}</p>
              </div>
              ` : ''}
            </div>
            
            <div class="alternative-info">
              <h3 style="margin-top: 0; color: #0066cc;">🤝 What are your options?</h3>
              <ul style="margin-bottom: 0;">
                <li>Your original booking time (${data.old_service_date} at ${data.old_service_time}) remains confirmed</li>
                <li>Contact us directly to discuss alternative available times</li>
                <li>Submit a new reschedule request for a different date/time</li>
                <li>Cancel your booking if needed (subject to our cancellation policy)</li>
              </ul>
            </div>
            
            <p>We understand this may be disappointing, and we're here to help find a solution that works for you. Please don't hesitate to contact us directly to explore other available options.</p>
            
            <p>Thank you for your understanding and for choosing Love4Detailing!</p>
          </div>
          
          <div class="footer">
            <p><strong>Love4Detailing</strong><br>
            Premium Mobile Car Detailing Service<br>
            📞 Contact us to discuss alternative options</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Log email notification to database for tracking
   */
  private static async logEmailNotification(data: {
    user_email: string
    email_type: EmailType
    subject: string
    booking_reference?: string
  }): Promise<void> {
    try {
      // TODO: Implement database logging once email_notifications table is created
      console.log('📊 Email notification logged:', {
        email: data.user_email,
        type: data.email_type,
        subject: data.subject,
        booking: data.booking_reference,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('❌ Error logging email notification:', error)
    }
  }
}

export default EmailService