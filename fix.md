# 🔐 Complete Authentication System Implementation Guide

## 🎯 Overview

This guide ensures all authentication flows work seamlessly for your Love4Detailing application, covering:

- **Anonymous Booking → Account Creation** (your primary flow)
- **Direct Signup/Login** 
- **Password Reset**
- **Protected Routes & Role-Based Access**
- **User Dashboard & Profile Management**

---

STEP 1 DONE
```

### 1.2 Configure Email Templates

**In Supabase → Authentication → Email Templates:**

**Confirm Signup Template:**
```html
<h2>Welcome to Love4Detailing!</h2>
<p>Thanks for signing up! Please confirm your email address.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>
<p>Your booking reference: {{ .Token }}</p>
```

**Reset Password Template:**
```html
<h2>Reset Your Love4Detailing Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, please ignore this email.</p>
```

---

## 📋 STEP 2: Auth Callback Handler (5 minutes)

### 2.1 Create Auth Callback Route

**Create: `src/app/auth/callback/route.ts`**

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?message=${error.message}`);
      }

      if (data.user) {
        // Check if user profile exists, create if not
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              role: 'customer',
              created_at: new Date().toISOString()
            });

          if (createError) {
            console.error('Profile creation error:', createError);
          }
        }

        // Redirect to intended destination
        return NextResponse.redirect(`${requestUrl.origin}${next}`);
      }
    } catch (error) {
      console.error('Unexpected auth error:', error);
      return NextResponse.redirect(`${requestUrl.origin}/auth/error`);
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`);
}
```

---

## 📋 STEP 3: Auth Pages Implementation (20 minutes)

### 3.1 Login Page

**Create: `src/app/auth/login/page.tsx`**

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Check user role and redirect accordingly
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const redirectTo = profile?.role === 'admin' ? '/admin' : '/dashboard';
        router.push(redirectTo);
        router.refresh();
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-900">
            Welcome Back
          </CardTitle>
          <p className="text-gray-600">Sign in to your Love4Detailing account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Sign In
            </Button>

            <div className="text-center space-y-2">
              <Link 
                href="/auth/reset-password" 
                className="text-sm text-purple-600 hover:underline"
              >
                Forgot your password?
              </Link>
              <div className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-purple-600 hover:underline">
                  Sign up here
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.2 Signup Page

**Create: `src/app/auth/signup/page.tsx`**

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            first_name: firstName,
            last_name: lastName,
            role: 'customer',
            created_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        setSuccess(true);
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Check Your Email!
            </h2>
            <p className="text-gray-600 mb-4">
              We've sent you a confirmation link at <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Click the link in your email to activate your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-900">
            Create Account
          </CardTitle>
          <p className="text-gray-600">Join Love4Detailing today</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <User className="h-4 w-4 mr-2" />
              )}
              Create Account
            </Button>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-purple-600 hover:underline">
                Sign in here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.3 Password Reset Page

**Create: `src/app/auth/reset-password/page.tsx`**

```typescript
'use client';

import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const supabase = createClientComponentClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Check Your Email!
            </h2>
            <p className="text-gray-600 mb-4">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Click the link in your email to reset your password.
            </p>
            <Link href="/auth/login" className="text-purple-600 hover:underline mt-4 inline-block">
              Back to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-900">
            Reset Password
          </CardTitle>
          <p className="text-gray-600">Enter your email to receive a reset link</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Reset Link
            </Button>

            <div className="text-center text-sm text-gray-600">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-purple-600 hover:underline">
                Sign in here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 📋 STEP 4: Anonymous Booking to Account Creation (15 minutes)

### 4.1 Enhanced Anonymous Booking API

**Update: `src/app/api/bookings/anonymous/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    
    const {
      email,
      firstName,
      lastName,
      phone,
      vehicleId,
      timeSlotId,
      serviceType,
      totalPrice,
      createAccount = false,  // New field
      password = null         // New field
    } = body;

    // Step 1: Create the booking first
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_email: email,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone: phone,
        vehicle_id: vehicleId,
        time_slot_id: timeSlotId,
        service_type: serviceType,
        total_price: totalPrice,
        status: 'confirmed',
        payment_status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Booking creation failed: ${bookingError.message}`);
    }

    // Step 2: If user wants to create account, do it now
    let user = null;
    if (createAccount && password) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${request.nextUrl.origin}/auth/callback?next=/dashboard`,
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        });

        if (authError) {
          console.error('Account creation failed:', authError);
          // Don't fail the booking if account creation fails
        } else if (authData.user) {
          user = authData.user;
          
          // Create user profile
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            role: 'customer',
            created_at: new Date().toISOString()
          });

          // Link the booking to the user
          await supabase
            .from('bookings')
            .update({ user_id: user.id })
            .eq('id', booking.id);
        }
      } catch (accountError) {
        console.error('Account creation error:', accountError);
        // Continue with booking even if account creation fails
      }
    }

    // Step 3: Mark time slot as unavailable
    await supabase
      .from('time_slots')
      .update({ is_available: false })
      .eq('id', timeSlotId);

    return NextResponse.json({
      success: true,
      booking: booking,
      accountCreated: !!user,
      userId: user?.id || null,
      message: user 
        ? 'Booking confirmed and account created! Check your email to verify your account.'
        : 'Booking confirmed successfully!'
    });

  } catch (error) {
    console.error('Anonymous booking error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Booking failed' 
      },
      { status: 500 }
    );
  }
}
```

### 4.2 Enhanced Booking Form Component

**Update your booking form to include account creation option:**

```typescript
// Add these to your booking form state
const [createAccount, setCreateAccount] = useState(false);
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

// Add this to your booking form JSX (before submit button)
<div className="border-t pt-4">
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      id="createAccount"
      checked={createAccount}
      onChange={(e) => setCreateAccount(e.target.checked)}
      className="rounded border-gray-300"
    />
    <label htmlFor="createAccount" className="text-sm font-medium">
      Create an account to track your bookings
    </label>
  </div>
  
  {createAccount && (
    <div className="mt-4 space-y-4 p-4 bg-blue-50 rounded-lg">
      <div>
        <Label htmlFor="password">Choose Password</Label>
        <Input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 6 characters"
          minLength={6}
          required={createAccount}
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required={createAccount}
        />
      </div>
      {password !== confirmPassword && password && confirmPassword && (
        <p className="text-sm text-red-600">Passwords do not match</p>
      )}
    </div>
  )}
</div>

// Update your form submission to include the new fields
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (createAccount && password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }
  
  const bookingData = {
    // ... your existing fields
    createAccount,
    password: createAccount ? password : null
  };
  
  // ... rest of your submission logic
};
```

---

## 📋 STEP 5: Protected Routes & Middleware (10 minutes)

### 5.1 Auth Middleware

**Create: `src/middleware.ts`**

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?message=Admin access required', req.url));
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?message=Admin access required', req.url));
    }
  }

  // Protected user dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?message=Please sign in to continue', req.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && req.nextUrl.pathname.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const redirectTo = profile?.role === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/auth/:path*'
  ],
};
```

### 5.2 Auth Context Provider

**Create: `src/lib/context/AuthContext.tsx`**

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/auth-helpers-nextjs';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'customer';
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Profile refresh error:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## 📋 STEP 6: User Dashboard (10 minutes)

### 6.1 User Dashboard Page

**Create: `src/app/dashboard/page.tsx`**

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Car, Clock, Phone, Mail, User, LogOut } from 'lucide-react';

interface Booking {
  id: string;
  service_type: string;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  time_slots: {
    slot_date: string;
    slot_time: string;
  };
  vehicles: {
    registration: string;
    make: string;
    model: string;
  };
}

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          time_slots (slot_date, slot_time),
          vehicles (registration, make, model)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Bookings fetch error:', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Bookings fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {profile?.first_name || 'Customer'}!
              </h1>
              <p className="text-gray-600">Manage your Love4Detailing bookings</p>
            </div>
            <Button onClick={signOut} variant="outline" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{profile?.email}</span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                <Badge variant="outline" className="w-fit">
                  {profile?.role === 'admin' ? 'Administrator' : 'Customer'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Bookings */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Your Bookings ({bookings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading your bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No bookings yet.</p>
                    <Button className="mt-4" onClick={() => window.location.href = '/book'}>
                      Book Your First Service
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {booking.service_type}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Booking #{booking.id.slice(0, 8)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                            <p className="text-lg font-bold text-green-600 mt-1">
                              £{booking.total_price}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>{formatDate(booking.time_slots.slot_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>{formatTime(booking.time_slots.slot_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-gray-500" />
                            <span>
                              {booking.vehicles.registration} ({booking.vehicles.make} {booking.vehicles.model})
                            </span>
                          </div>
                          <div className="text-gray-500">
                            Payment: {booking.payment_status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📋 STEP 7: Deploy and Test Complete Auth System (10 minutes)

### 7.1 Update Root Layout with Auth Provider

**Update: `src/app/layout.tsx`**

```typescript
import { AuthProvider } from '@/lib/context/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 7.2 Deploy to Vercel

```bash
git add .
git commit -m "feat: Complete authentication system implementation

✅ Features:
- Complete login/signup/password reset flows
- Anonymous booking with optional account creation
- Protected routes with role-based access
- User dashboard with booking history
- Auth context and middleware
- Email confirmation and password reset

🔧 Technical:
- Supabase auth integration
- Route protection middleware
- User profile management
- Booking-to-account linking
- Error handling and validation"

git push origin main
```

### 7.3 Comprehensive Testing Protocol

**Test 1: Anonymous Booking → Account Creation**
1. Go to `/book` and complete booking WITHOUT creating account
2. Verify booking works and email confirmation sent
3. Complete another booking WITH account creation
4. Check email for account verification link

**Test 2: Direct Signup**
1. Go to `/auth/signup`
2. Create new account
3. Check email for verification link
4. Click link and verify redirect to dashboard

**Test 3: Login Flow**
1. Go to `/auth/login`
2. Login with created account
3. Verify redirect to dashboard (customers) or admin (admins)

**Test 4: Password Reset**
1. Go to `/auth/reset-password`
2. Enter email and submit
3. Check email for reset link
4. Click link and set new password

**Test 5: Protected Routes**
1. Try accessing `/admin` without login → should redirect to login
2. Try accessing `/dashboard` without login → should redirect to login
3. Login as customer and try `/admin` → should redirect to dashboard

**Test 6: User Dashboard**
1. Login as customer
2. Go to `/dashboard`
3. Verify profile info and booking history display
4. Test sign out functionality

---

## 🎯 Success Criteria Checklist

**✅ Authentication Flows:**
- [ ] Anonymous booking works (without account)
- [ ] Anonymous booking with account creation works
- [ ] Direct signup flow works with email verification
- [ ] Login redirects correctly based on user role
- [ ] Password reset flow works end-to-end

**✅ Protected Routes:**
- [ ] `/admin` requires admin role
- [ ] `/dashboard` requires any authenticated user
- [ ] Auth pages redirect authenticated users appropriately

**✅ User Experience:**
- [ ] Users receive confirmation emails
- [ ] Dashboard shows booking history
- [ ] Profile information displays correctly
- [ ] Sign out works from all pages

**✅ Integration:**
- [ ] Bookings link to user accounts when created
- [ ] Role-based access control works
- [ ] All forms have proper validation
- [ ] Error messages are user-friendly

This complete authentication system ensures users can seamlessly book services, create accounts, and manage their profile while maintaining proper security and role-based access control.