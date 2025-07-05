import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user && !isRedirecting) {
      setIsRedirecting(true);
      window.location.href = '/';
    }
  }, [user, loading, isRedirecting]);

  return { user, loading };
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    // Handle specific error types with better messages
    if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      throw new Error('Email rate limit exceeded. Please wait a few minutes before requesting another password reset.');
    } else if (error.message?.includes('Error sending') || error.message?.includes('email')) {
      throw new Error('Email service temporarily unavailable. Please try again later or contact support.');
    }
    throw new Error(error.message);
  }
}

export async function updateProfile(userId: string, data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
} 