'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { personalDetailsSchema, type PersonalDetails } from '@/lib/validation/booking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useEffect } from 'react';

export default function PersonalDetailsStep() {
  const { state, dispatch } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
    reset
  } = useForm<PersonalDetails>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      firstName: state.data.customer?.firstName || '',
      lastName: state.data.customer?.lastName || '',
      email: state.data.customer?.email || '',
      phone: state.data.customer?.phone || '',
      address_line1: state.data.customer?.address_line1 || '',
      address_line2: state.data.customer?.address_line2 || '',
      city: state.data.customer?.city || '',
      postcode: state.data.customer?.postcode || '',
    },
    mode: 'onTouched'
  });

  // Reset form with persisted data when it changes
  useEffect(() => {
    if (state.data.customer) {
      reset({
        firstName: state.data.customer.firstName,
        lastName: state.data.customer.lastName,
        email: state.data.customer.email,
        phone: state.data.customer.phone,
        address_line1: state.data.customer.address_line1,
        address_line2: state.data.customer.address_line2,
        city: state.data.customer.city,
        postcode: state.data.customer.postcode,
      });
    }
  }, [state.data.customer, reset]);

  const onSubmit = async (data: PersonalDetails) => {
    try {
      // Clear any previous errors
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Update customer details in context
      dispatch({ type: 'SET_CUSTOMER_DETAILS', payload: data });
      
      // Proceed to next step
      dispatch({ type: 'SET_STEP', payload: BookingStep.VehicleSize });
    } catch (error) {
      console.error('Error saving personal details:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to save personal details' 
      });
    }
  };

  const handleBack = () => {
    // Save current form data before going back
    const formData = {
      firstName: state.data.customer?.firstName || '',
      lastName: state.data.customer?.lastName || '',
      email: state.data.customer?.email || '',
      phone: state.data.customer?.phone || '',
      address_line1: state.data.customer?.address_line1 || '',
      address_line2: state.data.customer?.address_line2 || '',
      city: state.data.customer?.city || '',
      postcode: state.data.customer?.postcode || '',
    };
    dispatch({ type: 'SET_CUSTOMER_DETAILS', payload: formData });
    dispatch({ type: 'SET_STEP', payload: BookingStep.Registration });
  };

  // Helper function to determine if we should show error for a field
  const shouldShowError = (fieldName: keyof PersonalDetails): boolean => {
    return Boolean((touchedFields[fieldName] || isSubmitted) && errors[fieldName]);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="on">
        <div>
          <h2 className="text-xl font-semibold mb-4">Personal Details</h2>
          <p className="text-gray-600 mb-4">
            Please provide your contact information for booking confirmation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-sm font-medium">First Name</label>
            <Input
              id="firstName"
              {...register('firstName')}
              autoComplete="given-name"
              placeholder="Enter your first name"
              className={shouldShowError('firstName') ? 'border-red-500' : ''}
              required
            />
            {shouldShowError('firstName') && errors.firstName && (
              <p className="text-red-600 text-sm mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm font-medium">Last Name</label>
            <Input
              id="lastName"
              {...register('lastName')}
              autoComplete="family-name"
              placeholder="Enter your last name"
              className={shouldShowError('lastName') ? 'border-red-500' : ''}
              required
            />
            {shouldShowError('lastName') && errors.lastName && (
              <p className="text-red-600 text-sm mt-1">
                {errors.lastName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              autoComplete="email"
              placeholder="Enter your email"
              className={shouldShowError('email') ? 'border-red-500' : ''}
              required
            />
            {shouldShowError('email') && errors.email && (
              <p className="text-red-600 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium">Phone</label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              autoComplete="tel"
              placeholder="Enter your phone number"
              className={shouldShowError('phone') ? "border-red-500" : ""}
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="address_line1" className="block text-sm font-medium">Address Line 1</label>
            <Input
              id="address_line1"
              {...register('address_line1')}
              autoComplete="street-address"
              placeholder="Enter your street address"
              className={shouldShowError('address_line1') ? "border-red-500" : ""}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="address_line2" className="block text-sm font-medium">Address Line 2 (Optional)</label>
            <Input
              id="address_line2"
              {...register('address_line2')}
              autoComplete="address-line2"
              placeholder="Apartment, suite, etc."
              className={shouldShowError('address_line2') ? "border-red-500" : ""}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="city" className="block text-sm font-medium">City</label>
              <Input
                id="city"
                {...register('city')}
                autoComplete="address-level2"
                placeholder="Enter your city"
                className={shouldShowError('city') ? "border-red-500" : ""}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="postcode" className="block text-sm font-medium">Postcode</label>
              <Input
                id="postcode"
                {...register('postcode')}
                autoComplete="postal-code"
                placeholder="Enter your postcode"
                className={`${shouldShowError('postcode') ? 'border-red-500' : ''} uppercase`}
                required
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            {state.error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </Card>
  );
} 