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

async function testAPIEndpoint() {
  console.log('Testing API endpoint with proper authentication...');
  
  // Create a client with service role
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
  
  // Get a valid session first
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.log('No authenticated user, creating one for testing...');
    
    // For testing, we'll simulate the API call directly
    try {
      const response = await fetch('http://localhost:3000/api/admin/schedule-template', {
        method: 'GET',
        headers: {
          'Cookie': 'supabase-auth-token=' + supabaseServiceKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Local API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Local API endpoint successful:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ Local API endpoint failed:', errorText);
      }
      
    } catch (error) {
      console.error('❌ Local API endpoint test failed:', error);
    }
  }
  
  // Test the AvailabilityService directly
  console.log('\nTesting AvailabilityService directly...');
  
  try {
    const { AvailabilityService } = await import('@/lib/services/availability');
    
    const template = await AvailabilityService.getWeeklyTemplate(supabase);
    console.log('✅ AvailabilityService.getWeeklyTemplate successful:', template);
    
  } catch (error) {
    console.error('❌ AvailabilityService test failed:', error);
  }
}

testAPIEndpoint().catch(console.error);