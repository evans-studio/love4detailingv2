'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Alert } from '@/components/ui/Alert';
import { Eye, EyeOff } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Check multiple sources for authentication
    const checkAuth = async () => {
      // First check URL hash for tokens (direct from Supabase)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      console.log('Update password page - checking auth:', {
        hasHashTokens: !!(accessToken && refreshToken),
        url: window.location.href
      });

      if (accessToken && refreshToken) {
        console.log('Found tokens in URL, setting session...');
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session from tokens:', error);
            setError('Failed to establish session. Please try the password reset link again.');
          } else {
            console.log('Session established for password update:', data.user?.email);
          }
        } catch (err) {
          console.error('Exception setting session:', err);
          setError('Failed to establish session. Please try the password reset link again.');
        }
      } else {
        // Check if session already exists
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.error('No valid session for password update:', error);
          setError('Invalid password reset session. Please request a new password reset link.');
        } else {
          console.log('Valid existing session found for password update:', session.user.email);
        }
      }
    };
    
    checkAuth();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        router.push('/auth/sign-in?message=Password updated successfully');
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141414]">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#28C76F]">Password Updated!</h2>
            <p className="mt-2 text-[#C7C7C7]">
              Your password has been successfully updated. You will be redirected to the sign-in page.
            </p>
            <LoadingState className="mt-4">Redirecting...</LoadingState>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414]">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#F2F2F2]">Update Your Password</h2>
          <p className="mt-2 text-[#C7C7C7]">
            Enter your new password below
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-[#BA0C2F]/10 border-[#BA0C2F] text-[#BA0C2F]">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#C7C7C7]">
              New Password
            </label>
            <div className="mt-1 relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-[#C7C7C7]" />
                ) : (
                  <Eye className="h-5 w-5 text-[#C7C7C7]" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#C7C7C7]">
              Confirm New Password
            </label>
            <div className="mt-1 relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-[#C7C7C7]" />
                ) : (
                  <Eye className="h-5 w-5 text-[#C7C7C7]" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <LoadingState>Updating Password...</LoadingState>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => router.push('/auth/sign-in')}
            className="text-sm text-[#9146FF] hover:text-[#9146FF]/80"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}