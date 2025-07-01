'use client';

import { useEffect, useState } from 'react';
import { AuthContext } from '@/lib/context/AuthContext';
import { signInWithEmail, signUpWithEmail, signOut, resetPassword, updateProfile } from '@/lib/api/auth';
import { supabase } from '@/lib/api/supabase';
import type { User } from '@/types';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: '',
          lastName: '',
          phone: null,
          createdAt: session.user.created_at!,
          updatedAt: session.user.created_at!
        });
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: '',
          lastName: '',
          phone: null,
          createdAt: session.user.created_at!,
          updatedAt: session.user.created_at!
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    signIn: signInWithEmail,
    signUp: signUpWithEmail,
    signOut,
    resetPassword,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 