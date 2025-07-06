import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function setupJanuaryTimeSlots() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('🕐 Setting up time slots for July 7-11, 2025...\n');

  // Define the dates for the next week (Monday to Friday)
  const dates = [
    '2025-07-07', // Monday
    '2025-07-08', // Tuesday
    '2025-07-09', // Wednesday
    '2025-07-10', // Thursday
    '2025-07-11'  // Friday
  ];

  // Define time slots (9 AM to 5 PM, every 2 hours)
  const timeSlots = [
    '09:00:00',
    '11:00:00', 
    '13:00:00',
    '15:00:00',
    '17:00:00'
  ];

  try {
    let totalCreated = 0;

    for (const date of dates) {
      console.log(`📅 Creating slots for ${date}...`);
      
      for (const time of timeSlots) {
        // Check if slot already exists
        const { data: existing } = await supabase
          .from('time_slots')
          .select('id')
          .eq('slot_date', date)
          .eq('slot_time', time)
          .single();

        if (existing) {
          console.log(`  ⏭️  Slot ${time} already exists, skipping`);
          continue;
        }

        // Create new time slot
        const { data, error } = await supabase
          .from('time_slots')
          .insert({
            slot_date: date,
            slot_time: time,
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error creating slot ${time}: ${error.message}`);
        } else {
          console.log(`  ✅ Created slot ${time} (ID: ${data.id})`);
          totalCreated++;
        }
      }
    }

    console.log(`\n🎉 Setup complete! Created ${totalCreated} new time slots.`);
    
    // Verify the created slots
    const { data: verifySlots, error: verifyError } = await supabase
      .from('time_slots')
      .select('*')
      .gte('slot_date', '2025-07-07')
      .lte('slot_date', '2025-07-11')
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (verifyError) {
      console.error('❌ Error verifying slots:', verifyError);
    } else {
      console.log('\n📊 Available time slots for booking week:');
      const groupedSlots = verifySlots?.reduce((acc, slot) => {
        if (!acc[slot.slot_date]) acc[slot.slot_date] = [];
        acc[slot.slot_date].push(slot);
        return acc;
      }, {} as Record<string, any[]>) || {};

      Object.entries(groupedSlots).forEach(([date, slots]) => {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        console.log(`  ${date} (${dayName}): ${(slots as any[]).length} slots available`);
        (slots as any[]).forEach((slot: any) => {
          const status = slot.is_available ? '🟢 AVAILABLE' : '🔴 UNAVAILABLE';
          console.log(`    ${slot.slot_time} - ${status}`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Export for use
export { setupJanuaryTimeSlots };

// Run if called directly
if (require.main === module) {
  setupJanuaryTimeSlots().catch(console.error);
}