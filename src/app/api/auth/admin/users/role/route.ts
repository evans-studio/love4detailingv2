import { NextRequest, NextResponse } from 'next/server'
import { AuthProcedures } from '@/lib/database/procedures'
import { createServerSupabase } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get admin user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userId, newRole, reason } = body

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'User ID and new role are required' },
        { status: 400 }
      )
    }

    // Validate role value
    const validRoles = ['customer', 'admin', 'staff', 'super_admin']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const { data, error } = await AuthProcedures.updateUserRole(
      userId,
      newRole,
      user.id,
      reason
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