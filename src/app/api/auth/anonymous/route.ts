import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Use service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, fullName, phone } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    let userId = existingUser?.id;

    if (!userId) {
      // Create new user if they don't exist
      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: phone || '',
          has_password: false
        }
      });

      if (createError || !data.user) {
        console.error('User creation error:', createError);
        return NextResponse.json(
          { error: createError?.message || 'Failed to create user' },
          { status: 500 }
        );
      }

      userId = data.user.id;

      // Create user profile in the users table
      const { error: profileError } = await supabaseAdmin.from('users').insert({
        id: userId,
        email: email,
        full_name: fullName,
        phone: phone || '',
        role: 'customer',
        created_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Clean up auth user if profile creation failed
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: 'Failed to create user profile', details: profileError.message },
          { status: 500 }
        );
      }
    }

    // Generate password reset link
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/setup-password`
      }
    );

    if (resetError) {
      console.error('Reset email error:', resetError);
      return NextResponse.json(
        { error: resetError.message },
        { status: 500 }
      );
    }

    // Get user metadata
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const hasPassword = userData?.user?.user_metadata?.has_password || false;

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email,
        full_name: fullName,
        phone: phone || ''
      },
      reset_link: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/setup-password`,
      userExists: !!existingUser,
      hasPassword
    });
  } catch (error) {
    console.error('Error in anonymous auth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 