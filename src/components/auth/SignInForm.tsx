'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const message = searchParams.get('message');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      setError(null);
      setLoading(true);
      await signIn(data.email, data.password);
      
      // Check for pending booking data
      const pendingBooking = sessionStorage.getItem('pendingBooking');
      if (pendingBooking) {
        sessionStorage.removeItem('pendingBooking');
      }

      // Check if user is admin and redirect appropriately
      const supabase = createClientComponentClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (userProfile && userProfile.role === 'admin') {
          router.push(redirect || '/admin');
        } else {
          router.push(redirect || '/dashboard');
        }
      } else {
        router.push(redirect || '/dashboard');
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md mx-auto space-y-4">
      {message && (
        <div className="text-sm text-[#28C76F] bg-[#1E1E1E] border border-gray-800 p-3 rounded-md">
          {message}
        </div>
      )}
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Email"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base"
        />
      </div>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Password"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base"
        />
      </div>
      {error && (
        <div className="text-sm text-[#BA0C2F]">
          {error}
        </div>
      )}
      <Button
        type="submit"
        className="w-full h-10 sm:h-12 text-sm sm:text-base"
        disabled={loading}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
} 