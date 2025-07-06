import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔐 Auth callback triggered');
  
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  
  console.log('📍 Callback details:', {
    hasCode: !!code,
    code: code?.slice(0, 10) + '...',
    next,
    fullUrl: request.url
  });

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    try {
      console.log('🔄 Exchanging code for session...');
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('❌ Code exchange error:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`
        );
      }

      if (data.user) {
        console.log('✅ User authenticated:', data.user.email);
        
        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('👤 Creating user profile...');
          
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              first_name: data.user.user_metadata?.first_name || '',
              last_name: data.user.user_metadata?.last_name || '',
              role: data.user.email === 'zell@love4detailing.com' ? 'admin' : 'customer',
              created_at: new Date().toISOString()
            });

          if (createError) {
            console.error('❌ Profile creation error:', createError);
          } else {
            console.log('✅ User profile created');
          }
        }

        // Redirect based on role
        const userRole = profile?.role || (data.user.email === 'zell@love4detailing.com' ? 'admin' : 'customer');
        const redirectUrl = userRole === 'admin' ? '/admin' : '/dashboard';
        
        console.log('🚀 Redirecting to:', redirectUrl);
        return NextResponse.redirect(`${requestUrl.origin}${redirectUrl}`);
      }
    } catch (error) {
      console.error('💥 Unexpected auth error:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/sign-in?error=Authentication failed`
      );
    }
  }

  console.log('⚠️ No code provided, redirecting to sign-in');
  return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in`);
}