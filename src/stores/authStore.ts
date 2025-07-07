import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { User, Session } from '@supabase/supabase-js'
import { UserRow } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  // State
  user: User | null
  profile: UserRow | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: ProfileUpdates) => Promise<void>
  createPostBookingAccount: (email: string, password: string, bookingId: string) => Promise<void>
  fetchProfile: () => Promise<void>
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  fullName: string
  phone?: string
}

interface ProfileUpdates {
  full_name?: string
  phone?: string
  preferred_communication?: string
  marketing_opt_in?: boolean
  service_preferences?: Record<string, any>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      profile: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      // Initialize auth state from Supabase
      initialize: async () => {
        try {
          set({ isLoading: true })
          
          const supabase = createClient()
          
          // Get initial session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) throw sessionError

          if (session?.user) {
            set({ 
              user: session.user, 
              session,
              isInitialized: true 
            })
            
            // Fetch user profile
            await get().fetchProfile()
          } else {
            set({ 
              user: null, 
              profile: null, 
              session: null,
              isInitialized: true,
              isLoading: false 
            })
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            set({ 
              user: session?.user || null, 
              session: session || null 
            })

            if (session?.user) {
              await get().fetchProfile()
            } else {
              set({ profile: null })
            }
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth'
          set({ error: errorMessage, isLoading: false, isInitialized: true })
        }
      },

      // Login with email and password
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          })

          if (error) throw error

          set({ 
            user: data.user, 
            session: data.session,
            isLoading: false 
          })

          // Fetch profile after login
          await get().fetchProfile()

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to login'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      // Register new user
      register: async (userData: RegisterData) => {
        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          
          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password
          })

          if (authError) throw authError

          if (authData.user) {
            // Create profile
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: userData.email,
                full_name: userData.fullName,
                phone: userData.phone || null,
                role: 'customer',
                is_active: true,
                email_verified_at: null
              })

            if (profileError) throw profileError

            set({ 
              user: authData.user, 
              session: authData.session,
              isLoading: false 
            })

            // Fetch the created profile
            await get().fetchProfile()
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to register'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      // Create account after booking (guest-to-customer flow)
      createPostBookingAccount: async (email: string, password: string, bookingId: string) => {
        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          
          // Use the API endpoint for post-booking account creation
          const response = await fetch('/api/auth/create-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              password,
              bookingId
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to create account')
          }

          const { user, session } = await response.json()

          set({ 
            user, 
            session,
            isLoading: false 
          })

          // Fetch profile after account creation
          await get().fetchProfile()

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      // Logout
      logout: async () => {
        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          const { error } = await supabase.auth.signOut()

          if (error) throw error

          set({ 
            user: null, 
            profile: null, 
            session: null,
            isLoading: false 
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to logout'
          set({ error: errorMessage, isLoading: false })
        }
      },

      // Fetch user profile
      fetchProfile: async () => {
        const { user } = get()
        
        if (!user) return

        try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (error) throw error

          set({ profile: data, isLoading: false })

        } catch (error) {
          console.error('Failed to fetch profile:', error)
          set({ isLoading: false })
        }
      },

      // Update user profile
      updateProfile: async (updates: ProfileUpdates) => {
        const { user } = get()
        
        if (!user) {
          throw new Error('No authenticated user')
        }

        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          const { data, error } = await supabase
            .from('users')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single()

          if (error) throw error

          set({ 
            profile: data,
            isLoading: false 
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      // Utility methods
      setError: (error: string | null) => {
        set({ error })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      }
    }),
    {
      name: 'auth-store'
    }
  )
)