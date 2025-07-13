import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

// DEBUG: Environment variable logging
console.log('🔍 SERVER SUPABASE DEBUG:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : 'MISSING',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...` : 'MISSING',
  timestamp: new Date().toISOString(),
  location: 'server.ts'
})

export const createServerSupabase = () => {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  
  // DEBUG: Log server supabase configuration
  console.log('🔍 SERVER SUPABASE INITIALIZED:', {
    supabaseUrl: supabase.supabaseUrl,
    supabaseKey: supabase.supabaseKey ? `${supabase.supabaseKey.substring(0, 10)}...` : 'MISSING',
    timestamp: new Date().toISOString()
  })
  
  return supabase
}