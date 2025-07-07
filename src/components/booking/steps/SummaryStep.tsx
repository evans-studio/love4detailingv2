'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/ui/loadingState';
import { Alert } from '@/components/ui/alert';
import type { UnifiedBookingForm } from '@/lib/validation/booking';
import { format } from 'date-fns';
import { CheckCircle, Car, User, Calendar, MapPin, Image } from 'lucide-react';

interface SummaryStepProps {
  onBack: () => void;
  vehicleSizes: Array<{
    id: string;
    label: string;
    description: string;
    price_pence: number;
  }>;
}

export function SummaryStep({ onBack, vehicleSizes }: SummaryStepProps) {
  const { 
    watch, 
    handleSubmit,
    formState: { errors }
  } = useFormContext<UnifiedBookingForm>();

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const formData = watch();

  // Get vehicle size details
  const vehicleSize = vehicleSizes.find(size => size.id === formData.vehicle?.size);
  const totalPrice = vehicleSize?.price_pence || 0;

  const onSubmit = async (data: UnifiedBookingForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload photos first if any
      const photoUrls: string[] = [];
      if (data.personalDetails.photos && data.personalDetails.photos.length > 0) {
        for (const photo of data.personalDetails.photos) {
          const formData = new FormData();
          formData.append('file', photo.file);
          formData.append('vehicleId', 'temp'); // Will be updated after vehicle creation
          
          const uploadResponse = await fetch('/api/upload-vehicle-photo', {
            method: 'POST',
            body: formData,
          });
          
          if (uploadResponse.ok) {
            const { url } = await uploadResponse.json();
            photoUrls.push(url);
          }
        }
      }

      // Submit booking
      const bookingData = {
        service: data.service,
        vehicle: {
          ...data.vehicle,
          photos: photoUrls,
        },
        personalDetails: {
          ...data.personalDetails,
          photos: undefined, // Remove file objects
        },
        dateTime: data.dateTime,
        vehicleSizeId: data.vehicle.size,
        totalPrice: totalPrice,
        distanceWarning: data.distanceWarning,
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const result = await response.json();
      setIsSuccess(true);
      
      // Redirect to confirmation page after success using Next.js router
      setTimeout(() => {
        router.push(`/confirmation?booking=${result.booking.id}`);
      }, 2000);

    } catch (error) {
      console.error('Booking submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'An error occurred while creating your booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-green-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600 mb-4">
          Your booking has been successfully created. You'll receive a confirmation email shortly.
        </p>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Redirecting to confirmation page...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-[#F2F2F2]">Review & Confirm</h2>
        <p className="text-[#C7C7C7] mb-6">
          Please review your booking details before confirming
        </p>
      </div>

      {/* Vehicle Information */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Car className="h-5 w-5 text-primary-600 mr-2" />
          <h3 className="font-semibold text-[#F2F2F2]">Vehicle Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-[#C7C7C7]">Make & Model:</span>
            <p className="font-medium">{formData.vehicle?.make} {formData.vehicle?.model}</p>
          </div>
          <div>
            <span className="text-sm text-[#C7C7C7]">Registration:</span>
            <p className="font-medium">{formData.vehicle?.registration}</p>
          </div>
          <div>
            <span className="text-sm text-[#C7C7C7]">Size:</span>
            <p className="font-medium">{vehicleSize?.label}</p>
          </div>
          <div>
            <span className="text-sm text-[#C7C7C7]">Price:</span>
            <p className="font-medium">£{(totalPrice / 100).toFixed(2)}</p>
          </div>
          {formData.vehicle?.year && (
            <div>
              <span className="text-sm text-[#C7C7C7]">Year:</span>
              <p className="font-medium">{formData.vehicle.year}</p>
            </div>
          )}
          {formData.vehicle?.color && (
            <div>
              <span className="text-sm text-[#C7C7C7]">Color:</span>
              <p className="font-medium">{formData.vehicle.color}</p>
            </div>
          )}
        </div>
      </div>

      {/* Personal Details */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center mb-4">
          <User className="h-5 w-5 text-primary-600 mr-2" />
          <h3 className="font-semibold text-[#F2F2F2]">Personal Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-[#C7C7C7]">Name:</span>
            <p className="font-medium">
              {formData.personalDetails?.firstName} {formData.personalDetails?.lastName}
            </p>
          </div>
          <div>
            <span className="text-sm text-[#C7C7C7]">Email:</span>
            <p className="font-medium">{formData.personalDetails?.email}</p>
          </div>
          <div>
            <span className="text-sm text-[#C7C7C7]">Phone:</span>
            <p className="font-medium">{formData.personalDetails?.phone}</p>
          </div>
          <div>
            <span className="text-sm text-[#C7C7C7]">Service Postcode:</span>
            <p className="font-medium">{formData.personalDetails?.postcode}</p>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-primary-600 mr-2" />
          <h3 className="font-semibold text-[#F2F2F2]">Appointment Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-[#C7C7C7]">Date:</span>
            <p className="font-medium">
              {formData.dateTime?.date && format(new Date(formData.dateTime.date), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div>
            <span className="text-sm text-[#C7C7C7]">Time:</span>
            <p className="font-medium">
              {formData.dateTime?.time && formatTimeSlot(formData.dateTime.time)}
            </p>
          </div>
        </div>
      </div>

      {/* Photos */}
      {formData.personalDetails?.photos && formData.personalDetails.photos.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Image className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="font-semibold text-[#F2F2F2]">Vehicle Photos</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {formData.personalDetails.photos.map((photo, index) => (
              <img
                key={photo.id}
                src={photo.preview}
                alt={`Vehicle photo ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border"
              />
            ))}
          </div>
        </div>
      )}

      {/* Distance Warning */}
      {formData.distanceWarning && (
        <Alert variant="warning">
          <MapPin className="h-4 w-4" />
          <div>
            <strong>Additional Travel Charges</strong>
            <p className="text-sm mt-1">
              Additional charges may apply for your location. This will be confirmed before service.
            </p>
          </div>
        </Alert>
      )}

      {/* Total Price */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-primary-900">Total Price:</span>
          <span className="text-2xl font-bold text-primary-600">
            £{(totalPrice / 100).toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-primary-700 mt-2">
          Payment will be collected on completion of service
        </p>
      </div>

      {/* Submit Error */}
      {submitError && (
        <Alert variant="destructive">
          <div>
            <strong>Booking Error</strong>
            <p className="text-sm mt-1">{submitError}</p>
          </div>
        </Alert>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting || isSuccess}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || isSuccess}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <LoadingState className="mr-2" />
              Creating Booking...
            </div>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </div>
    </div>
  );
}