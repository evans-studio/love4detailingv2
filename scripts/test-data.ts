import { config } from 'dotenv';
import path from 'path';
import { supabaseAdmin } from '../src/lib/api/supabase';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedTestData() {
  console.log('Seeding test data...');

  try {
    // Create test user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@love4detailing.com',
      password: 'testpass123',
      email_confirm: true
    });

    if (userError) throw userError;
    console.log('✅ Created test user:', user.user.email);

    // Create test vehicle
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .insert({
        user_id: user.user.id,
        registration: 'TEST123',
        make: 'Test Make',
        model: 'Test Model',
        year: 2023,
        size_id: 1 // Assuming size_id 1 exists
      })
      .select()
      .single();

    if (vehicleError) throw vehicleError;
    console.log('✅ Created test vehicle:', vehicle.registration);

    // Create test booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: user.user.id,
        vehicle_id: vehicle.id,
        service_id: 1, // Assuming service_id 1 exists
        time_slot_id: 1, // Assuming time_slot_id 1 exists
        status: 'pending',
        total_price_pence: 9999
      })
      .select()
      .single();

    if (bookingError) throw bookingError;
    console.log('✅ Created test booking for:', booking.user_id);

  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    process.exit(1);
  }
}

seedTestData(); 