import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/auth/sign-in?error=Auth callback failed', requestUrl.origin));
      }
      
      // Check if this is a password reset flow
      const type = requestUrl.searchParams.get('type');
      
      // Also check the hash fragment which may contain type info
      const hashType = requestUrl.hash.includes('type=recovery');
      
      // Check for password recovery indicators
      if (type === 'recovery' || hashType || requestUrl.searchParams.has('recovery')) {
        console.log('Password recovery detected, redirecting to update-password');
        return NextResponse.redirect(new URL('/auth/update-password', requestUrl.origin));
      }
      
      // Check if user was just created or needs password update
      if (data?.user?.email_confirmed_at && !data?.user?.last_sign_in_at) {
        console.log('New user detected, redirecting to update-password');
        return NextResponse.redirect(new URL('/auth/update-password', requestUrl.origin));
      }
      
      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(new URL('/auth/sign-in?error=Auth callback failed', requestUrl.origin));
    }
  }

  // If no code, redirect to sign in
  return NextResponse.redirect(new URL('/auth/sign-in', requestUrl.origin));
} 