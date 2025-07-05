import { config } from 'dotenv';
import path from 'path';
import { supabaseAdmin } from '../src/lib/api/supabase';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function setupDatabase() {
  console.log('Setting up database...');

  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client is not initialized');
    }

    // Create test time slots
    const timeSlots = [];
    const startDate = new Date();
    startDate.setHours(9, 0, 0, 0); // Start at 9 AM

    for (let i = 0; i < 14; i++) { // 2 weeks of slots
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      for (let hour = 9; hour <= 17; hour += 2) { // 9 AM to 5 PM, 2-hour slots
        const slotDate = new Date(date);
        slotDate.setHours(hour);

        timeSlots.push({
          slot_date: slotDate.toISOString().split('T')[0],
          slot_time: `${hour.toString().padStart(2, '0')}:00`,
          is_booked: false
        });
      }
    }

    const { error: timeSlotsError } = await supabaseAdmin
      .from('time_slots')
      .insert(timeSlots);

    if (timeSlotsError) {
      console.error('❌ Failed to create time slots:', timeSlotsError);
      return;
    }

    console.log(`✅ Created ${timeSlots.length} time slots`);

    // Create vehicle sizes
    const vehicleSizes = [
      { label: 'Small', description: 'Hatchback, Small Sedan', price_pence: 4999 },
      { label: 'Medium', description: 'Large Sedan, Small SUV', price_pence: 5999 },
      { label: 'Large', description: 'Large SUV, Van', price_pence: 7999 },
      { label: 'Extra Large', description: 'Truck, Large Van', price_pence: 9999 }
    ];

    const { error: sizeError } = await supabaseAdmin
      .from('vehicle_sizes')
      .insert(vehicleSizes);

    if (sizeError) {
      console.error('❌ Failed to create vehicle sizes:', sizeError);
      return;
    }

    console.log('✅ Created vehicle sizes');

    // Create services
    const services = [
      { name: 'Basic Wash', description: 'Exterior wash and dry', price_pence: 2999 },
      { name: 'Full Detail', description: 'Interior and exterior detailing', price_pence: 9999 },
      { name: 'Premium Package', description: 'Full detail with ceramic coating', price_pence: 19999 }
    ];

    const { error: servicesError } = await supabaseAdmin
      .from('services')
      .insert(services);

    if (servicesError) {
      console.error('❌ Failed to create services:', servicesError);
      return;
    }

    console.log('✅ Created services');

    console.log('\n✅ Database setup complete!\n');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase(); 