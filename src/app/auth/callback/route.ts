import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')


  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=callback_error`)
    }
  }

  // URL to redirect to after sign in process completes
  // If specific redirect URL provided, use it. Otherwise redirect to root and let middleware handle role-based routing
  const redirectUrl = requestUrl.searchParams.get('redirect_to') || '/'
  return NextResponse.redirect(`${requestUrl.origin}${redirectUrl}`)
}