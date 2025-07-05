'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingState } from '@/components/ui/LoadingState';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

export default function SetupPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const bookingId = searchParams.get('booking');
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    // Verify the invitation token
    const verifyInvitation = async () => {
      if (!token || type !== 'invite') {
        setError('Invalid or missing invitation link');
        setVerifying(false);
        return;
      }

      try {
        // The token verification is handled by Supabase when we call verifyOtp
        setVerifying(false);
      } catch (err) {
        setError('Invalid invitation link');
        setVerifying(false);
      }
    };

    verifyInvitation();
  }, [token, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Complete the invitation signup
      const { data, error: signUpError } = await supabase.auth.verifyOtp({
        token_hash: token!,
        type: 'invite',
      });

      if (signUpError) {
        throw signUpError;
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push(ROUTES.DASHBOARD);
      }, 2000);

    } catch (err) {
      console.error('Password setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up password');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingState>Verifying invitation...</LoadingState>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">
            Account Setup Complete!
          </h2>
          <p className="text-gray-600 mb-4">
            Your password has been set successfully. You'll be redirected to your dashboard shortly.
          </p>
          <LoadingState className="text-primary-600">
            Redirecting to dashboard...
          </LoadingState>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Set Up Your Password
          </h2>
          <p className="mt-2 text-gray-600">
            Complete your account setup to access your booking dashboard
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="Enter your password"
                required
                minLength={8}
                error={!!error}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="Confirm your password"
                required
                error={!!error}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !formData.password || !formData.confirmPassword}
            className="w-full"
          >
            {loading ? (
              <LoadingState className="text-white">Setting up password...</LoadingState>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </form>

        {bookingId && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Your booking is confirmed!</strong> Once you complete the password setup, 
              you'll be able to view and manage your booking in the dashboard.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}