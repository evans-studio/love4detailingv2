'use client';

import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const supabase = createClientComponentClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Magic link error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141414] p-4">
        <Card className="w-full max-w-md bg-[#1E1E1E] border-gray-800">
          <CardContent className="text-center p-8">
            <Mail className="h-16 w-16 text-[#28C76F] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#F2F2F2] mb-2">
              Magic Link Sent!
            </h2>
            <p className="text-[#C7C7C7] mb-4">
              Check your email at <strong className="text-[#F2F2F2]">{email}</strong> for the magic link.
            </p>
            <p className="text-sm text-[#8B8B8B]">
              Click the link to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414] p-4">
      <Card className="w-full max-w-md bg-[#1E1E1E] border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#9146FF] flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Access
          </CardTitle>
          <p className="text-[#C7C7C7]">Get admin access via magic link</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMagicLink} className="space-y-4">
            {error && (
              <Alert className="border-red-800 bg-red-900/20">
                <AlertDescription className="text-[#BA0C2F]">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-[#C7C7C7]">
                <Mail className="h-4 w-4" />
                Admin Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@love4detailing.com"
                required
                disabled={loading}
                className="bg-[#1A1A1A] border-gray-700 text-[#F2F2F2] placeholder:text-[#8B8B8B]"
              />
              <p className="text-xs text-[#8B8B8B]">
                Enter your admin email to receive a magic link
              </p>
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
              Send Magic Link
            </Button>

            <div className="text-center text-sm text-[#C7C7C7]">
              <p>This will send a magic link to your admin email.</p>
              <p className="mt-1">No password required.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}