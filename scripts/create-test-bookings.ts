import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Test booking data for 5 realistic users
const testUsers = [
  {
    firstName: 'James',
    lastName: 'Morrison',
    email: 'james.morrison@email.com',
    password: 'TestPass123!',
    phone: '07700900123',
    postcode: 'SW9 0SN',
    vehicle: {
      make: 'BMW',
      model: '3 Series',
      registration: 'BM18 JMO',
      year: '2018',
      color: 'Black',
      sizeId: 'medium', // BMW 3 Series - Medium size
    },
    bookingDate: '2025-01-08', // Wednesday
    timeSlot: '09:00'
  },
  {
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@email.com', 
    password: 'SecurePass456!',
    phone: '07700900456',
    postcode: 'SW9 1AB',
    vehicle: {
      make: 'Honda',
      model: 'Civic',
      registration: 'HC19 SCH',
      year: '2019',
      color: 'Silver',
      sizeId: 'small', // Honda Civic - Small size
    },
    bookingDate: '2025-01-09', // Thursday
    timeSlot: '11:00'
  },
  {
    firstName: 'David',
    lastName: 'Thompson',
    email: 'david.thompson@email.com',
    password: 'StrongPass789!',
    phone: '07700900789',
    postcode: 'SW9 2CD', 
    vehicle: {
      make: 'Land Rover',
      model: 'Range Rover Sport',
      registration: 'LR20 DVT',
      year: '2020',
      color: 'White',
      sizeId: 'extra-large', // Range Rover - Extra Large size
    },
    bookingDate: '2025-01-10', // Friday
    timeSlot: '14:00'
  },
  {
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@email.com',
    password: 'PowerPass321!',
    phone: '07700900321',
    postcode: 'SW9 3EF',
    vehicle: {
      make: 'Volkswagen',
      model: 'Golf',
      registration: 'VW21 EML',
      year: '2021', 
      color: 'Blue',
      sizeId: 'medium', // VW Golf - Medium size
    },
    bookingDate: '2025-01-11', // Saturday
    timeSlot: '10:00'
  },
  {
    firstName: 'Michael',
    lastName: "O'Connor",
    email: 'michael.oconnor@email.com',
    password: 'SafePass654!',
    phone: '07700900654',
    postcode: 'SW9 4GH',
    vehicle: {
      make: 'Audi',
      model: 'A6',
      registration: 'AU22 MOC',
      year: '2022',
      color: 'Grey',
      sizeId: 'large', // Audi A6 - Large size
    },
    bookingDate: '2025-01-12', // Sunday  
    timeSlot: '13:00'
  }
];

async function createTestBookings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('🚀 Starting creation of 5 test bookings...\n');

  // First, get vehicle sizes to map sizeId to actual IDs
  const { data: vehicleSizes, error: sizesError } = await supabase
    .from('vehicle_sizes')
    .select('*');
    
  if (sizesError) {
    console.error('❌ Error fetching vehicle sizes:', sizesError);
    return;
  }

  console.log('📊 Available vehicle sizes:');
  vehicleSizes?.forEach(size => {
    console.log(`  - ${size.label}: £${size.price_pence / 100} (ID: ${size.id})`);
  });
  console.log('');

  // Process each test user
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`\n📝 Creating booking ${i + 1}/5 for ${user.firstName} ${user.lastName}...`);
    
    // Add delay between users to avoid rate limiting
    if (i > 0) {
      console.log('  ⏱️  Waiting 10 seconds to avoid rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    try {
      // Step 1: Sign up user
      console.log(`  🔐 Signing up user: ${user.email}`);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            first_name: user.firstName,
            last_name: user.lastName
          }
        }
      });

      if (signUpError) {
        console.error(`  ❌ Sign up failed: ${signUpError.message}`);
        continue;
      }

      if (!authData.user) {
        console.error(`  ❌ No user returned from sign up`);
        continue;
      }

      console.log(`  ✅ User created with ID: ${authData.user.id}`);

      // Step 2: Create user profile
      console.log(`  👤 Creating user profile...`);
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: user.email,
          full_name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`  ❌ Profile creation failed: ${profileError.message}`);
        continue;
      }

      console.log(`  ✅ Profile created successfully`);

      // Step 3: Find vehicle size ID
      const sizeMapping = {
        'small': 'Small',
        'medium': 'Medium', 
        'large': 'Large',
        'extra-large': 'Extra Large'
      };
      
      const vehicleSize = vehicleSizes?.find(size => 
        size.label === sizeMapping[user.vehicle.sizeId as keyof typeof sizeMapping]
      );
      
      if (!vehicleSize) {
        console.error(`  ❌ Vehicle size '${user.vehicle.sizeId}' not found`);
        continue;
      }

      // Step 4: Create vehicle
      console.log(`  🚗 Creating vehicle: ${user.vehicle.make} ${user.vehicle.model}`);
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          user_id: authData.user.id,
          registration: user.vehicle.registration,
          make: user.vehicle.make,
          model: user.vehicle.model,
          year: parseInt(user.vehicle.year),
          color: user.vehicle.color,
          vehicle_size_id: vehicleSize.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (vehicleError) {
        console.error(`  ❌ Vehicle creation failed: ${vehicleError.message}`);
        continue;
      }

      console.log(`  ✅ Vehicle created with ID: ${vehicleData.id}`);

      // Step 5: Find available time slot
      console.log(`  📅 Finding time slot for ${user.bookingDate} at ${user.timeSlot}...`);
      const { data: timeSlots, error: slotsError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('slot_date', user.bookingDate)
        .eq('slot_time', user.timeSlot)
        .eq('is_booked', false)
        .limit(1);

      if (slotsError) {
        console.error(`  ❌ Error finding time slots: ${slotsError.message}`);
        continue;
      }

      if (!timeSlots || timeSlots.length === 0) {
        console.error(`  ❌ No available time slot for ${user.bookingDate} at ${user.timeSlot}`);
        continue;
      }

      const timeSlot = timeSlots[0];
      console.log(`  ✅ Found time slot ID: ${timeSlot.id}`);

      // Step 6: Create booking
      console.log(`  📋 Creating booking...`);
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: authData.user.id,
          vehicle_id: vehicleData.id,
          time_slot_id: timeSlot.id,
          full_name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          postcode: user.postcode,
          status: 'confirmed',
          booking_reference: `LFD${Date.now().toString().slice(-6)}${i + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (bookingError) {
        console.error(`  ❌ Booking creation failed: ${bookingError.message}`);
        continue;
      }

      // Step 7: Mark time slot as booked
      const { error: updateSlotError } = await supabase
        .from('time_slots')
        .update({ is_booked: true, updated_at: new Date().toISOString() })
        .eq('id', timeSlot.id);

      if (updateSlotError) {
        console.error(`  ⚠️  Warning: Could not mark time slot as booked: ${updateSlotError.message}`);
      }

      console.log(`  ✅ Booking created successfully!`);
      console.log(`     - Booking ID: ${bookingData.id}`);
      console.log(`     - Reference: ${bookingData.booking_reference}`);
      console.log(`     - Vehicle: ${user.vehicle.make} ${user.vehicle.model} (${user.vehicle.registration})`);
      console.log(`     - Date/Time: ${user.bookingDate} at ${user.timeSlot}`);
      console.log(`     - Price: £${vehicleSize.price_pence / 100}`);

    } catch (error) {
      console.error(`  ❌ Unexpected error for user ${user.firstName}: ${error}`);
    }
  }

  console.log('\n🎉 Booking creation process completed!');
  console.log('\n📊 Summary:');
  console.log('   Expected: 5 bookings created');
  console.log('   Users: James Morrison, Sarah Chen, David Thompson, Emily Rodriguez, Michael O\'Connor');
  console.log('   Dates: Jan 8-12, 2025 (First week)');
  console.log('   Vehicles: BMW 3 Series, Honda Civic, Range Rover Sport, VW Golf, Audi A6');
}

// Export for use
export { createTestBookings, testUsers };

// Run if called directly
if (require.main === module) {
  createTestBookings().catch(console.error);
}