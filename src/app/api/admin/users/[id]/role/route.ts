import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { updateUserRole, checkServerAdminAccess } from '@/lib/auth/admin';
import { cookies } from 'next/headers';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = params;
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !['customer', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "customer" or "admin"' },
        { status: 400 }
      );
    }

    // Get current user from session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const isAdmin = await checkServerAdminAccess(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Update user role
    const success = await updateUserRole(user.id, targetUserId, role);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `User role updated to ${role}` 
    });

  } catch (error) {
    console.error('Update user role API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}