import { createClient } from '@supabase/supabase-js';
import { addDays, startOfDay, isBefore, format, parseISO } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class TimeSlotsService {
  static async generateTimeSlotsIfNeeded(date: string): Promise<void> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not initialized - missing service role key');
        return;
      }

      let requestedDate;
      try {
        requestedDate = parseISO(date);
        if (isNaN(requestedDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        console.error('Invalid date format:', error);
        return;
      }

      // Generate slots for 14 days from the requested date
      const startDate = startOfDay(requestedDate);
      const endDate = addDays(startDate, 14);

      // Validate that we're not trying to generate slots in the past
      if (isBefore(endDate, startOfDay(new Date()))) {
        console.log('Cannot generate time slots for past dates');
        return;
      }

      const timeSlots = [
        { start: '10:00:00', end: '11:00:00' },
        { start: '11:30:00', end: '12:30:00' },
        { start: '13:00:00', end: '14:00:00' },
        { start: '14:30:00', end: '15:30:00' },
        { start: '16:00:00', end: '17:00:00' },
      ];

      const slots = [];
      let currentDate = startDate;

      while (currentDate <= endDate) {
        // Skip Sundays
        if (currentDate.getDay() !== 0) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          for (const timeSlot of timeSlots) {
            slots.push({
              slot_date: dateStr,
              start_time: timeSlot.start,
              end_time: timeSlot.end,
              is_blocked: false,
              max_bookings: 1,
              current_bookings: 0
            });
          }
        }
        currentDate = addDays(currentDate, 1);
      }

      console.log(`Attempting to generate ${slots.length} time slots from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

      // Check which slots already exist to avoid unnecessary operations
      const { data: existingSlots } = await supabaseAdmin
        .from('available_slots')
        .select('slot_date, start_time')
        .gte('slot_date', format(startDate, 'yyyy-MM-dd'))
        .lte('slot_date', format(endDate, 'yyyy-MM-dd'));

      // Filter out slots that already exist
      const newSlots = slots.filter(slot => {
        return !existingSlots?.some(existing => 
          existing.slot_date === slot.slot_date && 
          existing.start_time === slot.start_time
        );
      });

      console.log(`${newSlots.length} new slots to insert (${slots.length - newSlots.length} already exist)`);

      if (newSlots.length > 0) {
        // Use upsert with the admin client to handle conflicts
        const { data, error } = await supabaseAdmin
          .from('available_slots')
          .upsert(newSlots, { 
            onConflict: 'slot_date,start_time',
            ignoreDuplicates: true 
          })
          .select('id');
        
        if (error) {
          console.error('Supabase error generating time slots:', error);
          return;
        }

        console.log(`Successfully generated ${data?.length || 0} new time slots`);
      }
    } catch (error) {
      console.error('Unexpected error generating time slots:', error);
    }
  }
}