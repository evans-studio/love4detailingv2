import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

// DEBUG: Environment variable logging
console.log('🔍 CLIENT SUPABASE DEBUG:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : 'MISSING',
  timestamp: new Date().toISOString(),
  location: 'client.ts'
})

export const supabase = createClientComponentClient<Database>()

// DEBUG: Log supabase client configuration
console.log('🔍 SUPABASE CLIENT INITIALIZED:', {
  supabaseUrl: supabase.supabaseUrl,
  supabaseKey: supabase.supabaseKey ? `${supabase.supabaseKey.substring(0, 10)}...` : 'MISSING',
  timestamp: new Date().toISOString()
})