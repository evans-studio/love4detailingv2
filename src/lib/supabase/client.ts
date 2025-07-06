import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// For client-side operations with session persistence
export const createClient = () => createClientComponentClient<Database>()