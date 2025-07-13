'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// import { AuthProcedures } from '@/lib/database/procedures' // Not needed anymore

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'customer' | 'admin' | 'staff' | 'super_admin'
  is_active: boolean
  email_verified_at?: string
  profile_complete: boolean
  user_journey: string
  registration_date: string
  last_login?: string
}

interface UserPermissions {
  can_manage_users: boolean
  can_manage_services: boolean
  can_manage_bookings: boolean
  can_manage_schedule: boolean
  can_view_analytics: boolean
  can_manage_system: boolean
  can_create_manual_bookings: boolean
  can_edit_bookings: boolean
  can_cancel_bookings: boolean
  can_refund_payments: boolean
}

interface UserStatistics {
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  total_spent_pence: number
  last_booking_date?: string
  last_service_date?: string
  total_vehicles: number
  reward_points: number
  reward_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  permissions: UserPermissions | null
  statistics: UserStatistics | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (profileData: Partial<UserProfile>) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [statistics, setStatistics] = useState<UserStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        // Re-enable profile loading with error handling
        if (session?.user) {
          try {
            await loadUserProfile(session.user.id)
          } catch (error) {
            console.error('Failed to load profile on session init:', error)
          }
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        // Re-enable profile loading with error handling
        if (session?.user) {
          try {
            if (event === 'SIGNED_IN') {
              await handleUserLogin(session.user.id, session.user.email!)
            }
            await loadUserProfile(session.user.id)
          } catch (error) {
            console.error('Failed to load profile on auth change:', error)
          }
        } else {
          setProfile(null)
          setPermissions(null)
          setStatistics(null)
        }
        
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleUserLogin = async (userId: string, email: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.error('Failed to handle user login')
      }
    } catch (error) {
      console.error('Error handling user login:', error)
    }
  }

  const loadUserStatistics = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/statistics`)
      
      if (response.ok) {
        const { data } = await response.json()
        console.log('User statistics loaded:', data)
        setStatistics(data)
      } else {
        console.error('Failed to load user statistics:', response.status)
        // Set default statistics if API fails
        setStatistics({
          total_bookings: 0,
          completed_bookings: 0,
          cancelled_bookings: 0,
          total_spent_pence: 0,
          total_vehicles: 0,
          reward_points: 0,
          reward_tier: 'bronze'
        })
      }
    } catch (error) {
      console.error('Error loading user statistics:', error)
      // Set default statistics if API fails
      setStatistics({
        total_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        total_spent_pence: 0,
        total_vehicles: 0,
        reward_points: 0,
        reward_tier: 'bronze'
      })
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      const response = await fetch('/api/auth/profile')
      
      if (response.ok) {
        const { data } = await response.json()
        console.log('Profile loaded:', data)
        setProfile(data)
        
        // For now, set default permissions based on role
        if (data.role === 'super_admin') {
          setPermissions({
            can_manage_users: true,
            can_manage_services: true,
            can_manage_bookings: true,
            can_manage_schedule: true,
            can_view_analytics: true,
            can_manage_system: true,
            can_create_manual_bookings: true,
            can_edit_bookings: true,
            can_cancel_bookings: true,
            can_refund_payments: true
          })
        } else if (data.role === 'admin') {
          setPermissions({
            can_manage_users: false,
            can_manage_services: true,
            can_manage_bookings: true,
            can_manage_schedule: true,
            can_view_analytics: true,
            can_manage_system: false,
            can_create_manual_bookings: true,
            can_edit_bookings: true,
            can_cancel_bookings: true,
            can_refund_payments: false
          })
        } else {
          setPermissions({
            can_manage_users: false,
            can_manage_services: false,
            can_manage_bookings: false,
            can_manage_schedule: false,
            can_view_analytics: false,
            can_manage_system: false,
            can_create_manual_bookings: false,
            can_edit_bookings: false,
            can_cancel_bookings: false,
            can_refund_payments: false
          })
        }
        
        // Fetch user statistics from API
        await loadUserStatistics(data.id)
      } else if (response.status === 401) {
        // Invalid session - sign out the user
        console.warn('Invalid session detected, signing out user')
        await signOut()
      } else if (response.status === 500) {
        // Profile not found - this indicates orphaned auth user
        console.error('Profile not found for authenticated user - orphaned session detected')
        await signOut()
      } else {
        console.error('Failed to load profile:', response.status, response.statusText)
        // For other errors, just clear the profile but don't sign out
        setProfile(null)
        setPermissions(null)
        setStatistics(null)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Network or other errors - clear profile but don't sign out
      setProfile(null)
      setPermissions(null)
      setStatistics(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      })
      
      // Profile creation is handled by auth state change
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      
      // Clear all auth state
      setUser(null)
      setSession(null)
      setProfile(null)
      setPermissions(null)
      setStatistics(null)
      
      // Clear browser storage to prevent stale sessions
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear Supabase-specific storage keys
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
      
      // Redirect to homepage after successful sign out
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      
      // Force clear everything even if sign out fails
      setUser(null)
      setSession(null)
      setProfile(null)
      setPermissions(null)
      setStatistics(null)
      
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/'
      }
    }
  }

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })
      
      if (response.ok) {
        const { data } = await response.json()
        setProfile(data)
        return { error: null }
      } else {
        const { error } = await response.json()
        return { error }
      }
    } catch (error) {
      return { error }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!permissions) return false
    
    const permissionKey = `can_${permission}` as keyof UserPermissions
    return permissions[permissionKey] === true
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    permissions,
    statistics,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser() {
  const { user, profile, isLoading } = useAuth()
  return { user, profile, isLoading }
}

export function usePermissions() {
  const { permissions, hasPermission } = useAuth()
  return { permissions, hasPermission }
}