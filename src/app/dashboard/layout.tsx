'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { LoadingState } from '@/components/ui/loadingState';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ROUTES } from '@/lib/constants/routes';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      if (!loading) {
        if (!user) {
          router.replace(`${ROUTES.SIGN_IN}?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }

        // Verify user exists in profiles table
        const { data: profile, error } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          // User exists in auth but not in profiles
          await supabase.auth.signOut();
          router.replace(`${ROUTES.SIGN_IN}?error=profile_not_found`);
        }
      }
    };

    checkAuth();
  }, [user, loading, router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <LoadingState>Loading your dashboard...</LoadingState>
      </div>
    );
  }

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="flex min-h-screen bg-[#141414]">
      {/* Mobile: Hidden sidebar with hamburger menu */}
      {/* Desktop: Fixed sidebar */}
      <aside className="hidden lg:block w-64 bg-[#1E1E1E] border-r border-gray-800">
        <DashboardSidebar />
      </aside>
      
      {/* Main content area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 