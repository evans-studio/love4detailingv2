import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyExistingUsers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('🔍 Checking existing users and bookings in database...\n');

  try {
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
      
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`👥 Found ${users?.length || 0} users:`);
    users?.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.full_name || user.email} (${user.email})`);
    });

    // Check vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*, vehicle_sizes(label, price_pence)')
      .limit(10);
      
    if (vehiclesError) {
      console.error('❌ Error fetching vehicles:', vehiclesError);
    } else {
      console.log(`\n🚗 Found ${vehicles?.length || 0} vehicles:`);
      vehicles?.forEach((vehicle, index) => {
        console.log(`  ${index + 1}. ${vehicle.make} ${vehicle.model} (${vehicle.registration}) - ${vehicle.vehicle_sizes?.label}`);
      });
    }

    // Check bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        vehicles(make, model, registration),
        time_slots(slot_date, slot_time),
        users(full_name)
      `)
      .limit(10);
      
    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
    } else {
      console.log(`\n📋 Found ${bookings?.length || 0} bookings:`);
      bookings?.forEach((booking, index) => {
        console.log(`  ${index + 1}. ${booking.users?.full_name} - ${booking.vehicles?.make} ${booking.vehicles?.model} - ${booking.time_slots?.slot_date} ${booking.time_slots?.slot_time}`);
      });
    }

    // Check time slots for first week of January 2025
    const { data: timeSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .gte('slot_date', '2025-01-08')
      .lte('slot_date', '2025-01-12')
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });
      
    if (slotsError) {
      console.error('❌ Error fetching time slots:', slotsError);
    } else {
      console.log(`\n📅 Time slots for Jan 8-12, 2025:`);
      const groupedSlots = timeSlots?.reduce((acc, slot) => {
        if (!acc[slot.slot_date]) acc[slot.slot_date] = [];
        acc[slot.slot_date].push(slot);
        return acc;
      }, {} as Record<string, any[]>) || {};

      Object.entries(groupedSlots).forEach(([date, slots]) => {
        console.log(`  ${date}:`);
        (slots as any[]).forEach((slot: any) => {
          const status = slot.is_booked ? '🔴 BOOKED' : '🟢 AVAILABLE';
          console.log(`    ${slot.slot_time} - ${status}`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Export for use
export { verifyExistingUsers };

// Run if called directly
if (require.main === module) {
  verifyExistingUsers().catch(console.error);
}