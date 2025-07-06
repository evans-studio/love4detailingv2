import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { checkServerAdminAccess } from '@/lib/auth/admin';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Configure route as dynamic
export const dynamic = 'force-dynamic';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    
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

    let query = supabaseServiceRole
      .from('users')
      .select(`
        *,
        vehicles(count),
        bookings(count)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    if (role) {
      query = query.eq('role', role);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: users, error: usersError, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Users fetch error:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Fetch users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new user account (admin function)
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await checkServerAdminAccess(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, full_name, phone, role = 'customer' } = body;

    // Validate required fields
    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authUser, error: createError } = await supabaseServiceRole.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role
      }
    });

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create auth user', details: createError.message },
        { status: 500 }
      );
    }

    // Create user profile
    const { data: userProfile, error: profileError } = await supabaseServiceRole
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        phone,
        role
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await supabaseServiceRole.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: userProfile,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}