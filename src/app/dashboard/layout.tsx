'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { LoadingState } from '@/components/ui/LoadingState';
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
    <div className="flex h-screen bg-[#141414]">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <DashboardSidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 