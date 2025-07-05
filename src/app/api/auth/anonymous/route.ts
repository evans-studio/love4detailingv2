import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, fullName } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Check if user already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    let userId = existingUser?.id;
    let resetLink;

    if (!userId) {
      // Create new user if they don't exist
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          has_password: false
        }
      });

      if (createError || !data.user) {
        return NextResponse.json(
          { error: createError?.message || 'Failed to create user' },
          { status: 500 }
        );
      }

      userId = data.user.id;
    }

    // Generate password reset link
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
      }
    );

    if (resetError) {
      return NextResponse.json(
        { error: resetError.message },
        { status: 500 }
      );
    }

    // Get user status
    const { data: userData } = await supabase.auth.getUser(userId);
    const hasPassword = userData?.user?.user_metadata?.has_password || false;

    return NextResponse.json({
      user_id: userId,
      reset_link: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
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