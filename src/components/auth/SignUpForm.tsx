'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/AuthContext';

const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setError(null);
      setLoading(true);
      await signUp(data.email, data.password);
      // After successful signup, we'll update the profile with additional details
      // This is handled by the AuthProvider's signUp function which redirects to the callback URL
      router.push('/auth/verify-email');
    } catch (err) {
      setError('An error occurred while creating your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input
            placeholder="First Name"
            {...register('firstName')}
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && (
            <p className="text-red-600 text-sm mt-1">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Last Name"
            {...register('lastName')}
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && (
            <p className="text-red-600 text-sm mt-1">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Email"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Password"
          {...register('password')}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && (
          <p className="text-red-600 text-sm mt-1">
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Confirm Password"
          {...register('confirmPassword')}
          className={errors.confirmPassword ? 'border-red-500' : ''}
        />
        {errors.confirmPassword && (
          <p className="text-red-600 text-sm mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      {error && (
        <div className="text-sm text-[#BA0C2F]">
          {error}
        </div>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
} 