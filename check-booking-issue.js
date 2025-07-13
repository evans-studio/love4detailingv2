const { createClient } = require('@supabase/supabase-js');

async function checkBookingIssue() {
  console.log('🔍 Investigating booking issue for d.dimpauls@gmail.com');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Find the recent booking
    console.log('\n1️⃣ Checking recent bookings...');
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_reference, customer_email, vehicle_id, customer_name, user_id, created_at')
      .eq('customer_email', 'd.dimpauls@gmail.com')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (bookingError) {
      console.error('❌ Booking query error:', bookingError);
      return;
    }
    
    console.log(`✅ Found ${bookings?.length || 0} bookings`);
    bookings?.forEach((booking, i) => {
      console.log(`\nBooking ${i + 1}:`);
      console.log(`  ID: ${booking.id}`);
      console.log(`  Reference: ${booking.booking_reference}`);
      console.log(`  User ID: ${booking.user_id || 'NULL'}`);
      console.log(`  Vehicle ID: ${booking.vehicle_id || 'NULL'}`);
      console.log(`  Created: ${booking.created_at}`);
    });
    
    const recentBooking = bookings?.[0];
    if (!recentBooking) {
      console.log('❌ No recent booking found');
      return;
    }
    
    // 2. Check if vehicle exists if vehicle_id is set
    if (recentBooking.vehicle_id) {
      console.log('\n2️⃣ Checking linked vehicle...');
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', recentBooking.vehicle_id)
        .single();
        
      if (vehicleError) {
        console.error('❌ Vehicle not found:', vehicleError);
      } else {
        console.log('✅ Vehicle found:', {
          id: vehicle.id,
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
          user_id: vehicle.user_id
        });
      }
    } else {
      console.log('\n2️⃣ ❌ No vehicle_id set in booking - this is the issue!');
    }
    
    // 3. Check if user account exists
    console.log('\n3️⃣ Checking user account...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'd.dimpauls@gmail.com')
      .single();
      
    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ User query error:', userError);
    } else if (user) {
      console.log('✅ User account found:', {
        id: user.id,
        email: user.email,
        name: user.full_name
      });
      
      // 4. Check vehicles for this user
      console.log('\n4️⃣ Checking vehicles for user...');
      const { data: userVehicles, error: vehicleListError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);
        
      if (vehicleListError) {
        console.error('❌ User vehicles query error:', vehicleListError);
      } else {
        console.log(`✅ Found ${userVehicles?.length || 0} vehicles for user`);
        userVehicles?.forEach((v, i) => {
          console.log(`  Vehicle ${i + 1}: ${v.registration} - ${v.make} ${v.model} (${v.size})`);
        });
      }
    } else {
      console.log('❌ No user account found');
    }
    
    // 5. Summary and recommendations
    console.log('\n🎯 ISSUE SUMMARY:');
    if (!recentBooking.vehicle_id) {
      console.log('❌ The booking has no vehicle_id - vehicle data was not linked during booking creation');
      
      if (user) {
        console.log('✅ User account exists, so the issue is in the booking creation flow');
        console.log('🔧 LIKELY CAUSE: Vehicle creation/linking logic in the booking API is failing');
      } else {
        console.log('❌ No user account exists either - both user and vehicle creation failed');
      }
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

checkBookingIssue();