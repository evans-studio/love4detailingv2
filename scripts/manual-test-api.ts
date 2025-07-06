#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function manualTestAPI() {
  console.log('🧪 Manual API test simulating resend setup flow...\n');

  const email = 'paul@evans-studio.co.uk';
  const bookingId = '22af3913-a98f-49a4-a860-88590140b43e';

  console.log('📧 Testing with:', { email, bookingId });

  // Step 1: Get user by email from public profiles (like the API does)
  console.log('\n1️⃣ Getting user from public.users...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.log('❌ User not found:', userError?.message);
    return;
  }
  console.log('✅ User found:', user);

  // Step 2: Check if user exists in auth table (like the API does)
  console.log('\n2️⃣ Checking auth users...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === email);
  
  if (!authUser) {
    console.log('❌ Auth user not found');
    return;
  }
  console.log('✅ Auth user found:', { id: authUser.id, email: authUser.email });

  // Step 3: Try password reset (like the API does for existing users)
  console.log('\n3️⃣ Attempting password reset...');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app';
  const redirectTo = `${siteUrl}/auth/callback?type=recovery&booking=${bookingId}`;
  
  console.log('🔗 Redirect URL:', redirectTo);

  try {
    const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    );

    if (resetError) {
      console.log('❌ Password reset failed:', resetError.message);
      
      // Check for rate limit
      if (resetError.message?.includes('rate limit') || resetError.message?.includes('too many')) {
        console.log('⏰ Rate limit detected');
      }
    } else {
      console.log('✅ Password reset email sent successfully');
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }

  // Step 4: Get the booking details (like the API does)
  console.log('\n4️⃣ Getting booking details...');
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
    console.log('❌ Booking not found:', bookingError?.message);
  } else {
    console.log('✅ Booking found:', {
      id: booking.id,
      reference: booking.booking_reference,
      email: booking.email
    });
  }

  console.log('\n✅ Manual test complete');
}

manualTestAPI().catch(console.error);