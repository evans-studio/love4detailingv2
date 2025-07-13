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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const permission = searchParams.get('permission')

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission parameter is required' },
        { status: 400 }
      )
    }

    const { data, error } = await AuthProcedures.checkUserPermission(
      user.id,
      permission
    )

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