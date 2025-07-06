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
      .select(`
        *,
        slot_1_time,
        slot_2_time, 
        slot_3_time,
        slot_4_time,
        slot_5_time
      `)
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
        // Generate time slots using custom times from template
        const customTimes = [
          dayTemplate.slot_1_time || '08:00:00',
          dayTemplate.slot_2_time || '10:00:00', 
          dayTemplate.slot_3_time || '12:00:00',
          dayTemplate.slot_4_time || '14:00:00',
          dayTemplate.slot_5_time || '16:00:00'
        ];
        
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
            .from('available_slots')
            .upsert({
              slot_date: dateStr,
              start_time: customTimes[slotNum - 1],
              end_time: customTimes[slotNum - 1].replace(/:(\d{2}):/, (_, minutes) => ':' + (parseInt(minutes) + 60).toString().padStart(2, '0') + ':'), // Add 1 hour
              is_blocked: false
            }, {
              onConflict: 'slot_date,start_time'
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
      .from('available_slots')
      .select('id')
      .eq('slot_date', date)
      .eq('is_blocked', false)
      .single();
    
    if (slotError || !slot) return false;
    
    // Check for existing bookings using UUID slot_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('slot_id', slot.id)
      .not('status', 'eq', 'cancelled')
      .single();
    
    if (bookingError && bookingError.code !== 'PGRST116') return false;
    
    return !booking; // Available if no booking exists
  }

  // Fixed getCalendarData method - handles the relationship properly
  static async getCalendarData(startDate: string, endDate: string, client?: any): Promise<AvailabilityCalendarDay[]> {
    const supabase = client || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('Loading calendar data for:', startDate, 'to', endDate);
    
    try {
      // Get availability config for date range
      const { data: dailyConfigs, error: configError } = await supabase
        .from('daily_availability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (configError) {
        console.error('Config error:', configError);
        throw configError;
      }

      // Get time slots - simplified query without complex joins
      const { data: slots, error: slotsError } = await supabase
        .from('available_slots')
        .select('*')
        .gte('slot_date', startDate)
        .lte('slot_date', endDate)
        .order('slot_date, slot_number');
      
      if (slotsError) {
        console.error('Slots error:', slotsError);
        throw slotsError;
      }

      // Get bookings separately to avoid complex join issues
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, time_slot_id, full_name, booking_reference, status')
        .not('status', 'eq', 'cancelled');
      
      if (bookingsError) {
        console.error('Bookings error:', bookingsError);
        // Don't throw - calendar can work without booking data
      }

      // Get weekly template as fallback
      const weeklyTemplate = await this.getWeeklyTemplate(supabase);
      
      // Build calendar data
      const calendarDays: AvailabilityCalendarDay[] = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay() as DayOfWeek;
        
        // Get config for this date
        const dailyConfig = dailyConfigs?.find((c: any) => c.date === dateStr);
        const templateConfig = weeklyTemplate.find((t: any) => t.day_of_week === dayOfWeek);
        
        const isWorkingDay = dailyConfig?.working_day ?? templateConfig?.working_day ?? false;
        const maxSlots = dailyConfig?.available_slots ?? templateConfig?.max_slots ?? 0;
        
        // Get slots for this date
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
          
          // Find booking for this slot
          const booking = slot ? bookings?.find((b: any) => b.time_slot_id === slot.id) : null;
          
          let status: 'available' | 'booked' | 'unavailable' = 'unavailable';
          
          if (slotNum <= maxSlots && isWorkingDay && slot?.is_available) {
            status = booking ? 'booked' : 'available';
          }
          
          if (status === 'available') {
            dayData.availableSlots++;
          }
          
          dayData.slots.push({
            slot_number: slotNum,
            time: slot?.slot_time || '',
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
      
      console.log('Calendar days built:', calendarDays.length);
      return calendarDays;
    } catch (error) {
      console.error('Calendar data error:', error);
      throw error;
    }
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

  // Validation helpers
  static validateTimeInRange(time: string): boolean {
    if (!time) return false;
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 480 && totalMinutes <= 1200; // 8AM-8PM
  }

  static validateTimeIn15MinIncrements(time: string): boolean {
    if (!time) return false;
    const [, minutes] = time.split(':').map(Number);
    return minutes % 15 === 0; // Must be 0, 15, 30, or 45 minutes
  }
}