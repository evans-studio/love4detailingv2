# Authentication Callback Fix Guide

## Problem Analysis
The error "both auth code and code verifier should be non-empty" indicates a PKCE authentication flow issue between your app and Supabase. This typically happens when the auth callback handler isn't properly configured.

## Step 1: Fix Supabase Auth Configuration (5 minutes)

### 1.1 Update Supabase Auth Settings
Go to Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://love4detailingv2.vercel.app
```

**Redirect URLs (add all of these):**
```
https://love4detailingv2.vercel.app/auth/callback
https://love4detailingv2.vercel.app/auth/confirm
https://love4detailingv2.vercel.app/dashboard
https://love4detailingv2.vercel.app/admin
https://love4detailingv2.vercel.app/auth/sign-in
```

### 1.2 Enable Email Confirmations
In Supabase → Authentication → Settings:
- **Enable email confirmations**: ✅ ON
- **Secure email change**: ✅ ON
- **Enable phone confirmations**: ❌ OFF

STEP 1 COMPLETE

STRICTLY VERCEL ENVIROMENT, NO LOCAL ENVIROMENT OR TESTING.

## Step 2: Fix Auth Callback Handler (10 minutes)

### 2.1 Create/Update Auth Callback Route
Create or update `src/app/auth/callback/route.ts`:

```typescript
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
```

### 2.2 Create Auth Confirm Route
Create `src/app/auth/confirm/route.ts`:

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const supabase = createRouteHandlerClient({ cookies });

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=Email confirmation failed`);
}
```

## Step 3: Update Signup Process (5 minutes)

### 3.1 Fix Signup Component
Update your signup component to use proper redirect URL:

```typescript
// In your signup component
const handleSignup = async (formData) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
      setError(error.message);
      return;
    }

    if (data.user && !data.session) {
      // Email confirmation required
      setSuccess(true);
      setMessage('Please check your email and click the confirmation link.');
    } else if (data.session) {
      // User is immediately signed in
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Signup error:', error);
    setError('An unexpected error occurred');
  }
};
```

### 3.2 Fix Login Component
Update your login component:

```typescript
// In your login component
const handleLogin = async (formData) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      console.error('Login error:', error);
      setError(error.message);
      return;
    }

    if (data.user) {
      // Check user role and redirect
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const redirectTo = profile?.role === 'admin' ? '/admin' : '/dashboard';
      window.location.href = redirectTo;
    }
  } catch (error) {
    console.error('Login error:', error);
    setError('An unexpected error occurred');
  }
};
```

## Step 4: Test Email Templates (5 minutes)

### 4.1 Update Supabase Email Templates
Go to Supabase → Authentication → Email Templates:

**Confirm Signup Template:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

**Magic Link Template:**
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>
```

## Step 5: Deploy and Test (10 minutes)

### 5.1 Deploy Changes
```bash
git add .
git commit -m "fix: Auth callback handler and PKCE flow issues"
git push origin main
```

### 5.2 Test Complete Flow
1. **Clear browser cache and cookies**
2. **Go to signup page**
3. **Sign up with**: `zell@love4detailing.com`
4. **Check email for confirmation link**
5. **Click confirmation link**
6. **Should redirect to admin dashboard**

### 5.3 Manual Admin Role Assignment
If signup works but admin role isn't assigned, run this SQL:

```sql
-- Make zell@love4detailing.com an admin
UPDATE users 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'zell@love4detailing.com';
```

## Step 6: Alternative Quick Fix (if above doesn't work)

### 6.1 Use Magic Link Instead
If PKCE flow continues to have issues, temporarily use magic link:

```typescript
// In your login component, add magic link option
const handleMagicLink = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
    }
  });
  
  if (!error) {
    alert('Check your email for the magic link!');
  }
};
```

## Expected Results

After these fixes:
- ✅ Signup should work without PKCE errors
- ✅ Email confirmation should redirect properly
- ✅ zell@love4detailing.com should automatically get admin role
- ✅ Login should redirect to admin dashboard
- ✅ No more "code verifier" errors

## Quick Debug Commands

If you still have issues, run these in browser console:

```javascript
// Check current auth state
supabase.auth.getSession().then(console.log);

// Check if user exists in database
supabase.from('users').select('*').then(console.log);
```

Try the auth callback fix first - this should resolve the PKCE error and get your client's admin account working properly.