'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/LoadingState';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check URL hash for auth tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // Check URL search params as backup
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const urlType = searchParams.get('type');

        console.log('Auth callback - type:', type || urlType, 'tokens:', !!accessToken, 'code:', !!code);

        // If we have tokens in hash (password reset flow)
        if (accessToken && refreshToken) {
          setStatus('Setting up session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Session setup error:', error);
            router.push('/auth/sign-in?error=Failed to set up session');
            return;
          }

          // Check if this is a recovery flow
          if (type === 'recovery' || urlType === 'recovery') {
            console.log('Recovery flow detected, redirecting to update-password');
            router.push('/auth/update-password');
            return;
          }
        }

        // If we have a code (regular auth flow)
        if (code) {
          setStatus('Exchanging code for session...');
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            router.push('/auth/sign-in?error=Authentication failed');
            return;
          }
        }

        // Default redirect to dashboard
        setStatus('Redirecting...');
        router.push('/dashboard');

      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/auth/sign-in?error=Authentication failed');
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingState className="mb-4">{status}</LoadingState>
        <p className="text-gray-600">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
}