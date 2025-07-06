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

async function testResendSetupAPI() {
  console.log('🧪 Testing resend setup API...\n');

  // Get the booking from database
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (bookingError || !booking) {
    console.error('❌ No booking found:', bookingError);
    return;
  }

  console.log('📅 Found booking:', {
    id: booking.id,
    email: booking.email,
    booking_reference: booking.booking_reference
  });

  // Test the API directly
  try {
    const response = await fetch('http://localhost:3000/api/auth/resend-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: booking.email,
        bookingId: booking.id
      })
    });

    console.log('\n📡 API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    } else {
      const data = await response.json();
      console.log('✅ Success Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Fetch Error:', error);
  }

  // Also check if user exists in users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', booking.email)
    .single();

  console.log('\n👤 User check:');
  if (userError) {
    console.log('❌ User not found in users table:', userError.message);
  } else {
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    });
  }

  // Check auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === booking.email);

  console.log('\n🔐 Auth user check:');
  if (!authUser) {
    console.log('❌ User not found in auth table');
  } else {
    console.log('✅ Auth user found:', {
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at
    });
  }
}

testResendSetupAPI().catch(console.error);