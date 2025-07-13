import { NextRequest, NextResponse } from 'next/server'
import { AuthProcedures } from '@/lib/database/procedures'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    // Validate user session with stored procedure
    const { data, error } = await AuthProcedures.validateUserSession(user.id)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}