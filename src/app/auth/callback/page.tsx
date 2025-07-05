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
        // Get the full URL for debugging
        const fullUrl = window.location.href;
        console.log('Full callback URL:', fullUrl);
        
        // Check URL hash for auth tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        
        // Check URL search params
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const searchType = searchParams.get('type');
        
        // Check if URL contains recovery indicators
        const urlContainsRecovery = fullUrl.includes('type=recovery') || 
                                   fullUrl.includes('recovery') || 
                                   fullUrl.includes('password');

        console.log('Auth callback debug:', {
          hashType,
          searchType,
          hasAccessToken: !!accessToken,
          hasCode: !!code,
          urlContainsRecovery,
          fullUrl,
          hash: window.location.hash,
          search: window.location.search
        });

        // Determine if this is a recovery flow - be more aggressive
        const isRecoveryFlow = hashType === 'recovery' || 
                              searchType === 'recovery' || 
                              urlContainsRecovery ||
                              // If we came from password reset and have tokens, assume recovery
                              (accessToken && document.referrer.includes('reset-password'));

        console.log('Recovery flow detected:', isRecoveryFlow);

        // If this is definitely a recovery flow but no tokens, wait for them
        if (isRecoveryFlow && !accessToken && !code) {
          console.log('Recovery flow detected but no tokens yet, waiting...');
          setStatus('Processing password reset...');
          
          // Wait a bit longer for tokens to appear in URL
          setTimeout(() => {
            const newHashParams = new URLSearchParams(window.location.hash.substring(1));
            const newAccessToken = newHashParams.get('access_token');
            const newRefreshToken = newHashParams.get('refresh_token');
            
            if (newAccessToken && newRefreshToken) {
              console.log('Tokens found after delay, setting session...');
              supabase.auth.setSession({
                access_token: newAccessToken,
                refresh_token: newRefreshToken,
              }).then(({ data, error }) => {
                if (error) {
                  console.error('Delayed session setup error:', error);
                  router.push('/auth/sign-in?error=Failed to set up session');
                } else {
                  console.log('Delayed session established, redirecting to update-password');
                  router.push('/auth/update-password');
                }
              });
            } else {
              console.log('Still no tokens, redirect to update-password anyway');
              router.push('/auth/update-password');
            }
          }, 2000); // Wait 2 seconds for tokens
          return;
        }

        // If we have tokens in hash (password reset/magic link flow)
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

          console.log('Session established, user:', data.user?.email);

          // For hash-based authentication (password reset/magic link), always check if it's recovery
          if (isRecoveryFlow) {
            console.log('Recovery flow with tokens, redirecting to update-password');
            setStatus('Redirecting to password update...');
            router.push('/auth/update-password');
            return;
          }
          
          // If we have hash tokens but no clear recovery indicator, ask user
          console.log('Hash-based auth but unclear if recovery - checking with user');
          const isPasswordReset = confirm('Is this a password reset? Click OK to set a new password, or Cancel to go to dashboard.');
          if (isPasswordReset) {
            console.log('User confirmed password reset, redirecting to update-password');
            router.push('/auth/update-password');
            return;
          }
        }

        // If we have a code (OAuth/regular auth flow)
        if (code) {
          setStatus('Exchanging code for session...');
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            router.push('/auth/sign-in?error=Authentication failed');
            return;
          }

          // Check if this code-based flow is recovery
          if (isRecoveryFlow) {
            console.log('Code-based recovery flow, redirecting to update-password');
            router.push('/auth/update-password');
            return;
          }
        }

        // If we detected recovery but have no auth method, redirect to update-password
        if (isRecoveryFlow) {
          console.log('Recovery flow detected but no standard auth tokens, redirecting to update-password');
          router.push('/auth/update-password');
          return;
        }

        // Default redirect - check if user is admin
        setStatus('Redirecting...');
        
        // Check if user is admin and redirect appropriately
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (userProfile && userProfile.role === 'admin') {
            setStatus('Redirecting to admin portal...');
            router.push('/admin');
          } else {
            setStatus('Redirecting to dashboard...');
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/auth/sign-in?error=Authentication failed');
      }
    };

    // Add a small delay to ensure URL is fully loaded
    const timer = setTimeout(handleAuthCallback, 100);
    return () => clearTimeout(timer);
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