'use client';

import { useState } from 'react';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/context/AuthContext';

const userSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  notes: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserStep() {
  const { state, dispatch } = useBooking();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: state.data.firstName || user?.user_metadata?.first_name || '',
      lastName: state.data.lastName || user?.user_metadata?.last_name || '',
      email: state.data.email || user?.email || '',
      phone: state.data.phone || user?.user_metadata?.phone || '',
      notes: state.data.notes || '',
    },
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      setLoading(true);
      dispatch({
        type: 'UPDATE_DATA',
        payload: data,
      });
      dispatch({ type: 'SET_STEP', payload: BookingStep.Review });
    } catch (error) {
      console.error('Error updating user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: BookingStep.DateTime });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">First Name</label>
          <Input
            placeholder="Enter your first name"
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">Last Name</label>
          <Input
            placeholder="Enter your last name"
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-sm text-red-500">{errors.lastName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            placeholder="Enter your email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">Phone</label>
          <Input
            type="tel"
            placeholder="Enter your phone number"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium mb-1">Additional Notes (Optional)</label>
        <textarea
          className="w-full min-h-[100px] px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Any special requests or additional information"
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-sm text-red-500">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-between space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          Back to Date & Time
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Review Booking'}
        </Button>
      </div>
    </form>
  );
} 