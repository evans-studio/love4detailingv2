import { createClient } from '@supabase/supabase-js';
import type { 
  DailyAvailability, 
  WeeklyScheduleTemplate, 
  TimeSlotWithAvailability,
  AvailabilityCalendarDay,
  DayOfWeek 
} from '@/types';

export class AvailabilityService {
  // Weekly Schedule Template Management
  static async getWeeklyTemplate(client?: any): Promise<WeeklyScheduleTemplate[]> {
    const supabase = client || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .order('day_of_week');
    
    if (error) throw error;
    return data || [];
  }

  static async updateWeeklyTemplate(
    dayOfWeek: DayOfWeek, 
    config: Partial<WeeklyScheduleTemplate>,
    client?: any
  ): Promise<WeeklyScheduleTemplate> {
    const supabase = client || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabase
      .from('weekly_schedule_template')
      .upsert({
        day_of_week: dayOfWeek,
        ...config,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Generate Week Slots - Using your existing schema
  static async generateWeekSlots(startDate: string, client?: any): Promise<any[]> {
    const supabase = client || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const result = [];
    const slotTimes = ['10:00:00', '11:30:00', '13:00:00', '14:30:00', '16:00:00'];
    
    // Get weekly template
    const template = await this.getWeeklyTemplate(supabase);
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      // Get template for this day
      const dayTemplate = template.find((t: any) => t.day_of_week === dayOfWeek);
      
      if (dayTemplate?.working_day && dayTemplate.max_slots > 0) {
        // Create daily availability record
        await supabase
          .from('daily_availability')
          .upsert({
            date: dateStr,
            available_slots: dayTemplate.max_slots,
            working_day: true,
            updated_at: new Date().toISOString()
          });
        
        // Generate time slots using correct column names
        for (let slotNum = 1; slotNum <= dayTemplate.max_slots; slotNum++) {
          const { error } = await supabase
            .from('time_slots')
            .upsert({
              slot_date: dateStr,          // ✅ Correct column name
              slot_time: slotTimes[slotNum - 1], // ✅ Correct column name
              slot_number: slotNum,
              is_available: true,
              buffer_minutes: 30
            }, {
              onConflict: 'slot_date,slot_time'
            });
          
          if (error) console.log('Slot creation error:', error);
        }
        
        result.push({
          generated_date: dateStr,
          generated_slots: dayTemplate.max_slots,
          message: `Generated ${dayTemplate.max_slots} slots`
        });
      } else {
        // Non-working day
        await supabase
          .from('daily_availability')
          .upsert({
            date: dateStr,
            available_slots: 0,
            working_day: false,
            updated_at: new Date().toISOString()
          });
        
        result.push({
          generated_date: dateStr,
          generated_slots: 0,
          message: 'Non-working day'
        });
      }
    }
    
    return result;
  }

  // Check Slot Availability - Using UUID time_slot_id
  static async checkSlotAvailability(date: string, slotNumber: number, client?: any): Promise<boolean> {
    const supabase = client || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Check if day is working and slot exists
    const { data: slot, error: slotError } = await supabase
      .from('time_slots')
      .select('id')
      .eq('slot_date', date)              // ✅ Correct column name
      .eq('slot_number', slotNumber)
      .eq('is_available', true)
      .single();
    
    if (slotError || !slot) return false;
    
    // Check for existing bookings using UUID time_slot_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('time_slot_id', slot.id)        // ✅ Correct UUID reference
      .not('status', 'eq', 'cancelled')
      .single();
    
    if (bookingError && bookingError.code !== 'PGRST116') return false;
    
    return !booking; // Available if no booking exists
  }

  // Calendar View Data - Using proper schema with UUID relationships
  static async getCalendarData(startDate: string, endDate: string, client?: any): Promise<AvailabilityCalendarDay[]> {
    const supabase = client || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get availability config for date range
    const { data: dailyConfigs, error: configError } = await supabase
      .from('daily_availability')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (configError) throw configError;

    // Get time slots with bookings using proper foreign key relationship
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings!time_slots_time_slot_id_fkey(
          id,
          full_name,
          booking_reference,
          status
        )
      `)
      .gte('slot_date', startDate)         // ✅ Correct column name
      .lte('slot_date', endDate)           // ✅ Correct column name
      .order('slot_date, slot_number');
    
    if (slotsError) throw slotsError;

    // Get weekly template as fallback
    const weeklyTemplate = await this.getWeeklyTemplate(supabase);
    
    // Build calendar data
    const calendarDays: AvailabilityCalendarDay[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay() as DayOfWeek;
      
      // Get config for this date - FIX: Add proper type annotations
      const dailyConfig = dailyConfigs?.find((c: any) => c.date === dateStr);
      const templateConfig = weeklyTemplate.find((t: any) => t.day_of_week === dayOfWeek);
      
      const isWorkingDay = dailyConfig?.working_day ?? templateConfig?.working_day ?? false;
      const maxSlots = dailyConfig?.available_slots ?? templateConfig?.max_slots ?? 0;
      
      // Get slots for this date using correct column name
      const dateSlots = slots?.filter((s: any) => s.slot_date === dateStr) || [];
      
      const dayData: AvailabilityCalendarDay = {
        date: dateStr,
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: currentDate.getDate(),
        isWorkingDay,
        maxSlots,
        availableSlots: 0,
        slots: []
      };
      
      // Build slot data
      for (let slotNum = 1; slotNum <= 5; slotNum++) {
        const slot = dateSlots.find((s: any) => s.slot_number === slotNum);
        const booking = slot?.bookings?.find((b: any) => b.status !== 'cancelled');
        
        let status: 'available' | 'booked' | 'unavailable' = 'unavailable';
        
        if (slotNum <= maxSlots && isWorkingDay && slot?.is_available) {
          status = booking ? 'booked' : 'available';
        }
        
        if (status === 'available') {
          dayData.availableSlots++;
        }
        
        dayData.slots.push({
          slot_number: slotNum,
          time: slot?.slot_time || '',    // ✅ Correct column name
          status,
          booking: booking ? {
            id: booking.id,
            customer_name: booking.full_name,
            reference: booking.booking_reference
          } : undefined
        });
      }
      
      calendarDays.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return calendarDays;
  }

  // Additional helper methods for seamless UX
  static async getAvailableSlots(date: string, client?: any): Promise<any[]> {
    const supabase = client || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: slots, error } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings!time_slots_time_slot_id_fkey(id, status)
      `)
      .eq('slot_date', date)              // ✅ Correct column name
      .eq('is_available', true)
      .order('slot_number');
    
    if (error) throw error;
    
    return (slots || []).filter((slot: any) => {
      const activeBookings = slot.bookings?.filter((b: any) => b.status !== 'cancelled') || [];
      return activeBookings.length === 0;
    });
  }
}