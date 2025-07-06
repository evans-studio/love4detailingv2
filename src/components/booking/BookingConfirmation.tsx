'use client'

import { Button } from '@/components/ui/Button'
import { BookingSummaryRow } from '@/types/database.types'
import Link from 'next/link'

interface BookingConfirmationProps {
  booking: BookingSummaryRow
}

export function BookingConfirmation({ booking }: BookingConfirmationProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatPrice = (priceInPence: number) => {
    return `£${(priceInPence / 100).toFixed(2)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Booking Pending'
      case 'confirmed':
        return 'Booking Confirmed'
      case 'in_progress':
        return 'Service In Progress'
      case 'completed':
        return 'Service Completed'
      case 'cancelled':
        return 'Booking Cancelled'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#F2F2F2] mb-2">Booking Confirmed!</h1>
        <p className="text-[#C7C7C7]">
          Your Full Valet service has been successfully booked
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.status)}`}>
            {getStatusText(booking.status)}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Booking Reference:</span>
            <span className="font-mono font-medium text-[#9146FF]">{booking.booking_reference}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">{booking.service_name}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Date & Time:</span>
            <div className="text-right">
              <div className="font-medium">{formatDate(booking.slot_date)}</div>
              <div className="text-sm text-gray-500">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </div>
            </div>
          </div>

          {booking.vehicle_make && booking.vehicle_model && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Vehicle:</span>
              <div className="text-right">
                <div className="font-medium">
                  {booking.vehicle_make} {booking.vehicle_model}
                </div>
                {booking.vehicle_registration && (
                  <div className="text-sm text-gray-500">{booking.vehicle_registration}</div>
                )}
                {booking.vehicle_size && (
                  <div className="text-sm text-gray-500">
                    {booking.vehicle_size.charAt(0).toUpperCase() + booking.vehicle_size.slice(1)} vehicle
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Customer:</span>
            <div className="text-right">
              <div className="font-medium">{booking.customer_name}</div>
              <div className="text-sm text-gray-500">{booking.customer_email}</div>
              <div className="text-sm text-gray-500">{booking.customer_phone}</div>
            </div>
          </div>

          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium capitalize">
              {booking.payment_method?.replace('_', ' ') || 'Cash'}
            </span>
          </div>

          <div className="flex justify-between py-2 text-lg font-semibold">
            <span>Total:</span>
            <span className="text-[#9146FF]">{formatPrice(booking.total_price_pence)}</span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3">What happens next?</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            You'll receive a confirmation email with all the details
          </li>
          <li className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            We'll contact you 24 hours before your appointment to confirm
          </li>
          <li className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Our team will arrive at your location at the scheduled time
          </li>
          <li className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Payment is due upon completion of the service
          </li>
        </ul>
      </div>

      {/* Cancellation Policy */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-yellow-800">Cancellation Policy</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Free cancellation up to 24 hours before your appointment. 
              Cancellations within 24 hours may incur a charge.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/">Return to Home</Link>
        </Button>
        <Button asChild className="flex-1 bg-[#9146FF] hover:bg-[#7c3aed] text-white">
          <Link href="/book">Book Another Service</Link>
        </Button>
      </div>

      {/* Contact Information */}
      <div className="text-center mt-8 text-[#C7C7C7]">
        <p className="text-sm">
          Need to make changes or have questions?<br />
          Contact us at{' '}
          <a href="mailto:info@love4detailing.com" className="text-[#9146FF] hover:underline">
            info@love4detailing.com
          </a>{' '}
          or{' '}
          <a href="tel:0123456789" className="text-[#9146FF] hover:underline">
            0123 456 789
          </a>
        </p>
      </div>
    </div>
  )
}