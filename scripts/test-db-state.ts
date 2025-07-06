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

async function checkDatabaseState() {
  console.log('🔍 Checking database state...\n');

  // Check users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, full_name');

  console.log('👥 Users in database:', users?.length || 0);
  if (users && users.length > 0) {
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ${user.full_name}`);
    });
  }

  // Check bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, email, booking_reference, status');

  console.log('\n📅 Bookings in database:', bookings?.length || 0);
  if (bookings && bookings.length > 0) {
    bookings.forEach(booking => {
      console.log(`   - ${booking.booking_reference} (${booking.email}) - ${booking.status}`);
    });
  }

  // Check auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  console.log('\n🔐 Auth users:', authUsers?.users?.length || 0);
  if (authUsers?.users && authUsers.users.length > 0) {
    authUsers.users.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
    });
  }

  console.log('\n✅ Database state check complete');
}

checkDatabaseState().catch(console.error);