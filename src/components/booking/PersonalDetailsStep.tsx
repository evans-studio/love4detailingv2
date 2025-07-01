'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { personalDetailsSchema, type PersonalDetails } from '@/lib/validation/booking';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export function PersonalDetailsStep() {
  const { state, dispatch } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
    }
  });

  const onSubmit = async (data: PersonalDetails) => {
    dispatch({ type: 'SET_CUSTOMER_DETAILS', payload: data });
    dispatch({ type: 'SET_STEP', payload: BookingStep.VehicleSize });
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: BookingStep.Registration });
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
              name="given-name"
              autoComplete="given-name"
              placeholder="Enter your first name"
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm font-medium">Last Name</label>
            <Input
              id="lastName"
              {...register('lastName')}
              name="family-name"
              autoComplete="family-name"
              placeholder="Enter your last name"
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium">Phone</label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              name="tel"
              autoComplete="tel"
              placeholder="Enter your phone number"
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="address_line1" className="block text-sm font-medium">Address Line 1</label>
            <Input
              id="address_line1"
              {...register('address_line1')}
              name="address-line1"
              autoComplete="address-line1"
              placeholder="Enter your street address"
              error={!!errors.address_line1}
              helperText={errors.address_line1?.message}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="address_line2" className="block text-sm font-medium">Address Line 2 (Optional)</label>
            <Input
              id="address_line2"
              {...register('address_line2')}
              name="address-line2"
              autoComplete="address-line2"
              placeholder="Apartment, suite, etc."
              error={!!errors.address_line2}
              helperText={errors.address_line2?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="city" className="block text-sm font-medium">City</label>
              <Input
                id="city"
                {...register('city')}
                name="city"
                autoComplete="address-level2"
                placeholder="Enter your city"
                error={!!errors.city}
                helperText={errors.city?.message}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="postcode" className="block text-sm font-medium">Postcode</label>
              <Input
                id="postcode"
                {...register('postcode')}
                name="postal-code"
                autoComplete="postal-code"
                placeholder="Enter your postcode"
                error={!!errors.postcode}
                helperText={errors.postcode?.message}
                className="uppercase"
              />
            </div>
          </div>
        </div>

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