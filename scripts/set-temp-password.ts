import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setTempPassword() {
  try {
    const email = 'paul@evans-studio.co.uk';
    const tempPassword = 'TempAdmin2024!';
    
    console.log(`Setting temporary password for ${email}...`);
    
    // Update user password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      // First, get the user ID
      (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id || '',
      {
        password: tempPassword,
        email_confirm: true
      }
    );
    
    if (error) {
      console.error('Error updating password:', error);
      return;
    }
    
    console.log('✅ Password updated successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Temporary Password: ${tempPassword}`);
    console.log('');
    console.log('⚠️  Please change this password after logging in!');
    console.log('🔗 Login at: http://localhost:3003/auth/sign-in');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

setTempPassword();