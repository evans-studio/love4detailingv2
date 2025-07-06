import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vercel-safe error handling
function handleError(error: any, context: string) {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel' : 'local'
  })
  
  return NextResponse.json(
    { 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    },
    { status: 500 }
  )
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Always check environment
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }
    
    // Create supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Your logic here
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
    
    if (error) throw error
    
    // Log successful requests in production
    if (process.env.VERCEL) {
      console.log(`[API_NAME] Success in ${Date.now() - startTime}ms`)
    }
    
    return NextResponse.json({ data })
    
  } catch (error) {
    return handleError(error, 'API_NAME')
  }
}

// Add runtime config for Vercel
export const runtime = 'edge' // or 'nodejs'
export const maxDuration = 10 // seconds