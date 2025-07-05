import { supabase } from '@/lib/supabase';
import type { 
  DailyAvailability, 
  WeeklyScheduleTemplate, 
  TimeSlotWithAvailability,
  AvailabilityCalendarDay,
  SlotGenerationResult,
  DayOfWeek 
} from '@/types';

export class AvailabilityService {
  // Weekly Schedule Template Management
  static async getWeeklyTemplate(): Promise<WeeklyScheduleTemplate[]> {
    const { data, error } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .order('day_of_week');
    
    if (error) throw error;
    return data || [];
  }

  static async updateWeeklyTemplate(
    dayOfWeek: DayOfWeek, 
    config: Partial<WeeklyScheduleTemplate>
  ): Promise<WeeklyScheduleTemplate> {
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

  // Daily Availability Management
  static async getDailyAvailability(date: string): Promise<DailyAvailability | null> {
    const { data, error } = await supabase
      .from('daily_availability')
      .select('*')
      .eq('date', date)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updateDailyAvailability(
    date: string, 
    config: Partial<DailyAvailability>
  ): Promise<DailyAvailability> {
    const { data, error } = await supabase
      .from('daily_availability')
      .upsert({
        date,
        ...config,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Slot Generation
  static async generateWeekSlots(startDate: string): Promise<SlotGenerationResult[]> {
    const { data, error } = await supabase
      .rpc('generate_week_slots', { start_date: startDate });
    
    if (error) throw error;
    return data || [];
  }

  // Availability Checking
  static async checkSlotAvailability(date: string, slotNumber: number): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_slot_availability', { 
        check_date: date, 
        check_slot_number: slotNumber 
      });
    
    if (error) throw error;
    return data || false;
  }

  static async getAvailableSlots(date: string): Promise<TimeSlotWithAvailability[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings!left(id, status)
      `)
      .eq('slot_date', date)
      .eq('is_available', true)
      .order('slot_number');
    
    if (error) throw error;
    
    return (data || []).map(slot => ({
      ...slot,
      booking_count: slot.bookings?.filter((b: any) => b.status !== 'cancelled').length || 0
    })).filter(slot => slot.booking_count === 0);
  }

  // Calendar View Data
  static async getCalendarData(startDate: string, endDate: string): Promise<AvailabilityCalendarDay[]> {
    // Get availability config for date range
    const { data: dailyConfigs, error: configError } = await supabase
      .from('daily_availability')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (configError) throw configError;

    // Get time slots with bookings for date range
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings!left(
          id,
          customer_name,
          booking_reference,
          status
        )
      `)
      .gte('slot_date', startDate)
      .lte('slot_date', endDate)
      .order('slot_date, slot_number');
    
    if (slotsError) throw slotsError;

    // Get weekly template as fallback
    const weeklyTemplate = await this.getWeeklyTemplate();
    
    // Build calendar data
    const calendarDays: AvailabilityCalendarDay[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay() as DayOfWeek;
      
      // Get config for this date
      const dailyConfig = dailyConfigs?.find(c => c.date === dateStr);
      const templateConfig = weeklyTemplate.find(t => t.day_of_week === dayOfWeek);
      
      const isWorkingDay = dailyConfig?.working_day ?? templateConfig?.working_day ?? false;
      const maxSlots = dailyConfig?.available_slots ?? templateConfig?.max_slots ?? 0;
      
      // Get slots for this date
      const dateSlots = slots?.filter(s => s.slot_date === dateStr) || [];
      
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
        const slot = dateSlots.find(s => s.slot_number === slotNum);
        const booking = slot?.bookings?.find((b: any) => b.status !== 'cancelled');
        
        let status: 'available' | 'booked' | 'unavailable' = 'unavailable';
        
        if (slotNum <= maxSlots && isWorkingDay) {
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
            customer_name: booking.customer_name,
            reference: booking.booking_reference
          } : undefined
        });
      }
      
      calendarDays.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return calendarDays;
  }

  // Bulk Operations
  static async bulkDeleteSlots(slotIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .in('id', slotIds);
    
    if (error) throw error;
  }

  static async bulkUpdateSlotAvailability(
    slotIds: string[], 
    isAvailable: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('time_slots')
      .update({ is_available: isAvailable })
      .in('id', slotIds);
    
    if (error) throw error;
  }
}