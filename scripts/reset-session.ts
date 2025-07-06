import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetSessions() {
  try {
    // List all users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    console.log(`Found ${users.users.length} users to process...`);

    // Sign out all users
    for (const user of users.users) {
      await supabase.auth.admin.signOut(user.id);
      console.log(`Signed out user: ${user.email}`);
    }

    console.log('Successfully reset all sessions');
  } catch (error) {
    console.error('Error resetting sessions:', error);
    process.exit(1);
  }
}

resetSessions(); 