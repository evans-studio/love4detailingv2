import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Configure route as dynamic for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, bookingId } = await request.json();

    if (!email || !bookingId) {
      return NextResponse.json(
        { error: 'Email and booking ID are required' },
        { status: 400 }
      );
    }

    // Using service role client defined above

    // Get user by email from public profiles
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user exists in auth table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === email);
    
    let emailSent = false;
    let setupMethod = '';
    
    if (authUser) {
      // User exists in auth, send password reset
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery&booking=${bookingId}`
        }
      );
      
      if (resetError) {
        console.error('Password reset failed:', resetError);
        
        // Handle rate limit errors more gracefully
        if (resetError.message?.includes('rate limit') || resetError.message?.includes('too many')) {
          return NextResponse.json(
            { error: 'Email rate limit exceeded. Please wait a few minutes before requesting another setup email.' },
            { status: 429 }
          );
        }
        
        // Handle general email sending errors
        if (resetError.message?.includes('Error sending') || resetError.message?.includes('email')) {
          return NextResponse.json(
            { 
              error: 'Email service temporarily unavailable. Please try again later or contact support.',
              fallback: 'You can manually reset your password by visiting the sign-in page and clicking "Forgot Password".',
              signInUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/sign-in`
            },
            { status: 503 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to send password reset email', details: resetError.message },
          { status: 500 }
        );
      }
      
      emailSent = true;
      setupMethod = 'password_reset';
    } else {
      // User doesn't exist in auth, send invite
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/setup-password?booking=${bookingId}`,
          data: {
            booking_id: bookingId,
            first_name: user.full_name?.split(' ')[0] || '',
            last_name: user.full_name?.split(' ')[1] || '',
          }
        }
      );
      
      if (inviteError) {
        console.error('Invite failed:', inviteError);
        
        // Handle rate limit errors more gracefully
        if (inviteError.message?.includes('rate limit') || inviteError.message?.includes('too many')) {
          return NextResponse.json(
            { error: 'Email rate limit exceeded. Please wait a few minutes before requesting another setup email.' },
            { status: 429 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to send setup invitation', details: inviteError.message },
          { status: 500 }
        );
      }
      
      emailSent = true;
      setupMethod = 'invite';
    }

    // Get the booking details for the email
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        vehicles (
          make,
          model,
          registration
        ),
        time_slots (
          slot_date,
          slot_time
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Setup email sent successfully via ${setupMethod}`,
      method: setupMethod,
      email_sent: emailSent,
    });
  } catch (error) {
    console.error('Error resending setup email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 