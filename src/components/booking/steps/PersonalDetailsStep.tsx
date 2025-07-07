'use client';

import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import type { UnifiedBookingForm, PostcodeDistanceResponse } from '@/lib/validation/booking';
import { X, Upload, Image } from 'lucide-react';

interface PersonalDetailsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PersonalDetailsStep({ onNext, onBack }: PersonalDetailsStepProps) {
  const { 
    register, 
    watch, 
    setValue, 
    formState: { errors },
    trigger
  } = useFormContext<UnifiedBookingForm>();

  const [photos, setPhotos] = useState<Array<{
    id: string;
    file: File;
    preview: string;
  }>>([]);
  const [distanceCheck, setDistanceCheck] = useState<PostcodeDistanceResponse | null>(null);
  const [isCheckingDistance, setIsCheckingDistance] = useState(false);

  const watchedPostcode = watch('personalDetails.postcode');

  // Check distance when postcode changes
  useEffect(() => {
    if (watchedPostcode && watchedPostcode.length >= 5) {
      checkPostcodeDistance(watchedPostcode);
    }
  }, [watchedPostcode]);

  // Update form with photos
  useEffect(() => {
    setValue('personalDetails.photos', photos);
  }, [photos, setValue]);

  const checkPostcodeDistance = async (postcode: string) => {
    setIsCheckingDistance(true);
    try {
      const response = await fetch(`/api/postcode-distance?postcode=${encodeURIComponent(postcode)}`);
      if (response.ok) {
        const data: PostcodeDistanceResponse = await response.json();
        setDistanceCheck(data);
        setValue('distanceWarning', data.isOverLimit);
      }
    } catch (error) {
      console.error('Error checking postcode distance:', error);
    } finally {
      setIsCheckingDistance(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 3 - photos.length).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const updated = prev.filter(photo => photo.id !== id);
      // Clean up blob URLs
      const removed = prev.find(photo => photo.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const handleNext = async () => {
    const isValid = await trigger(['personalDetails.firstName', 'personalDetails.lastName', 'personalDetails.email', 'personalDetails.phone', 'personalDetails.postcode']);
    if (isValid) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-[#F2F2F2]">Personal Details</h2>
        <p className="text-[#C7C7C7] mb-6">
          Please provide your contact information and vehicle photos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
            First Name <span className="text-[#BA0C2F]">*</span>
          </label>
          <Input
            {...register('personalDetails.firstName')}
            placeholder="Your first name"
            error={!!errors.personalDetails?.firstName}
          />
          {errors.personalDetails?.firstName && (
            <p className="mt-1 text-sm text-[#BA0C2F]">{errors.personalDetails.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
            Last Name <span className="text-[#BA0C2F]">*</span>
          </label>
          <Input
            {...register('personalDetails.lastName')}
            placeholder="Your last name"
            error={!!errors.personalDetails?.lastName}
          />
          {errors.personalDetails?.lastName && (
            <p className="mt-1 text-sm text-[#BA0C2F]">{errors.personalDetails.lastName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
            Email <span className="text-[#BA0C2F]">*</span>
          </label>
          <Input
            {...register('personalDetails.email')}
            type="email"
            placeholder="your@email.com"
            error={!!errors.personalDetails?.email}
          />
          {errors.personalDetails?.email && (
            <p className="mt-1 text-sm text-[#BA0C2F]">{errors.personalDetails.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
            Phone Number <span className="text-[#BA0C2F]">*</span>
          </label>
          <Input
            {...register('personalDetails.phone')}
            type="tel"
            placeholder="07123 456789"
            error={!!errors.personalDetails?.phone}
          />
          {errors.personalDetails?.phone && (
            <p className="mt-1 text-sm text-[#BA0C2F]">{errors.personalDetails.phone.message}</p>
          )}
        </div>

        {/* Postcode */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
            Service Postcode <span className="text-[#BA0C2F]">*</span>
          </label>
          <Input
            {...register('personalDetails.postcode')}
            placeholder="e.g. SW1A 1AA"
            error={!!errors.personalDetails?.postcode}
            className="uppercase"
          />
          {errors.personalDetails?.postcode && (
            <p className="mt-1 text-sm text-[#BA0C2F]">{errors.personalDetails.postcode.message}</p>
          )}
          {isCheckingDistance && (
            <p className="mt-2 text-sm text-[#8B8B8B]">Checking distance...</p>
          )}
        </div>
      </div>

      {/* Distance Warning */}
      {distanceCheck?.isOverLimit && (
        <Alert variant="warning">
          <div>
            <strong>Additional Travel Charges Apply</strong>
            <p className="mt-1 text-sm">
              {distanceCheck.warning || 'Your location is over 10 miles from our base. Additional travel charges may apply.'}
            </p>
          </div>
        </Alert>
      )}

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-[#C7C7C7] mb-3">
          Vehicle Condition Photos <span className="text-[#8B8B8B]">(Optional)</span>
        </label>
        <p className="text-sm text-[#8B8B8B] mb-4">
          Upload up to 3 photos of your vehicle to help us assess its condition
        </p>

        {/* Photo Upload Area */}
        {photos.length < 3 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">
                Click to upload photos
              </span>
              <span className="text-xs text-gray-500 mt-1">
                PNG, JPG up to 10MB each
              </span>
            </label>
          </div>
        )}

        {/* Photo Previews */}
        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative">
                <img
                  src={photo.preview}
                  alt="Vehicle photo"
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {/* Add more photos button */}
            {photos.length < 3 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center">
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer text-center"
                >
                  <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600">Add more</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Next: Select Date & Time
        </button>
      </div>
    </div>
  );
}