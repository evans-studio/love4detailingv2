'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
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

  const handleMagicLink = async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const supabase = createClientComponentClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect || '/dashboard'}`,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4">
        <div className="text-[#28C76F] bg-[#1E1E1E] border border-gray-800 p-6 rounded-lg">
          <svg className="h-12 w-12 mx-auto mb-4 text-[#28C76F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-[#F2F2F2] mb-2">Magic Link Sent!</h3>
          <p className="text-[#C7C7C7] text-sm">
            We've sent a magic link to your email. Click the link to sign in automatically.
          </p>
        </div>
        <button
          onClick={() => {
            setMagicLinkSent(false);
            setShowMagicLink(false);
          }}
          className="text-[#9146FF] hover:underline text-sm"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {message && (
        <div className="text-sm text-[#28C76F] bg-[#1E1E1E] border border-gray-800 p-3 rounded-md">
          {message}
        </div>
      )}

      {!showMagicLink ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              {...register('email')}
              className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base ${errors.email ? 'border-red-500' : ''}`}
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
              className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base ${errors.password ? 'border-red-500' : ''}`}
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">
                {errors.password.message}
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
            className="w-full h-10 sm:h-12 text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowMagicLink(true)}
              className="text-[#9146FF] hover:underline text-sm"
            >
              Sign in with magic link instead
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-[#F2F2F2] mb-2">Sign in with Magic Link</h3>
            <p className="text-[#C7C7C7] text-sm">
              Enter your email address and we'll send you a link to sign in.
            </p>
          </div>
          
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              {...register('email')}
              className={`w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          
          {error && (
            <div className="text-sm text-[#BA0C2F]">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => {
                const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value;
                if (email) {
                  handleMagicLink(email);
                } else {
                  setError('Please enter your email address');
                }
              }}
              className="w-full h-10 sm:h-12 text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? 'Sending magic link...' : 'Send magic link'}
            </Button>
            
            <button
              type="button"
              onClick={() => setShowMagicLink(false)}
              className="w-full text-[#C7C7C7] hover:text-[#F2F2F2] text-sm"
            >
              Back to password sign in
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 