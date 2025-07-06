'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ROUTES } from '@/lib/constants/routes';
import { LoadingState } from '@/components/ui/LoadingState';
import { UnifiedBookingForm } from '@/components/booking/UnifiedBookingForm';

export default function BookingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check auth state without clearing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth check error:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          // Check if user has a profile
          const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            router.replace(ROUTES.DASHBOARD);
            return;
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <LoadingState>Loading...</LoadingState>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#141414]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F2F2F2] mb-2">Book Your Detail</h1>
          <p className="text-sm sm:text-base text-[#C7C7C7]">Complete your booking in just a few steps</p>
        </div>
        <UnifiedBookingForm />
      </div>
    </main>
  );
} 