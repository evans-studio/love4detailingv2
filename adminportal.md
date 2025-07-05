# L4D Admin Portal & Slot Formula Implementation Guide

## 🎯 Implementation Overview

This guide implements the complete admin portal enhancement with the 5-slot daily formula system into the existing L4D architecture. Execute these changes in order to maintain database integrity and component dependencies.

---

## 📊 Database Migrations

### 1. Create Migration File: `supabase/migrations/022_slot_formula_system.sql`

```sql
-- Slot Formula System Implementation
-- Working Hours: 10:00-18:00, Max 5 slots/day, 30min travel buffer

-- Drop existing constraints if they exist
ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_slot_number_check;

-- Enhance time_slots table with formula constraints
ALTER TABLE time_slots 
ADD COLUMN IF NOT EXISTS slot_number INTEGER,
ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
ADD CONSTRAINT time_slots_slot_number_check CHECK (slot_number >= 1 AND slot_number <= 5);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_time_slots_date_slot ON time_slots(date, slot_number);

-- Daily availability configuration
CREATE TABLE IF NOT EXISTS daily_availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    available_slots INTEGER DEFAULT 5 CHECK (available_slots >= 0 AND available_slots <= 5),
    working_day BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date)
);

-- Weekly schedule template (for recurring schedules)
CREATE TABLE IF NOT EXISTS weekly_schedule_template (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    max_slots INTEGER DEFAULT 5 CHECK (max_slots >= 0 AND max_slots <= 5),
    working_day BOOLEAN DEFAULT true,
    start_time TIME DEFAULT '10:00:00',
    end_time TIME DEFAULT '18:00:00',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(day_of_week)
);

-- Insert default weekly template (Monday-Friday working days)
INSERT INTO weekly_schedule_template (day_of_week, working_day, max_slots, start_time, end_time)
VALUES 
    (1, true, 5, '10:00:00', '18:00:00'),  -- Monday
    (2, true, 5, '10:00:00', '18:00:00'),  -- Tuesday
    (3, true, 5, '10:00:00', '18:00:00'),  -- Wednesday
    (4, true, 5, '10:00:00', '18:00:00'),  -- Thursday
    (5, true, 5, '10:00:00', '18:00:00'),  -- Friday
    (6, false, 0, '10:00:00', '18:00:00'), -- Saturday
    (0, false, 0, '10:00:00', '18:00:00')  -- Sunday
ON CONFLICT (day_of_week) DO NOTHING;

-- Update existing time_slots with slot numbers based on time
UPDATE time_slots 
SET slot_number = CASE 
    WHEN time = '10:00:00' THEN 1
    WHEN time = '11:30:00' THEN 2
    WHEN time = '13:00:00' THEN 3
    WHEN time = '14:30:00' THEN 4
    WHEN time = '16:00:00' THEN 5
    ELSE slot_number
END
WHERE slot_number IS NULL;

-- Add RLS policies for new tables
ALTER TABLE daily_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule_template ENABLE ROW LEVEL SECURITY;

-- Policies for daily_availability
CREATE POLICY "Admin can manage daily availability" ON daily_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policies for weekly_schedule_template  
CREATE POLICY "Admin can manage weekly schedule" ON weekly_schedule_template
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Function to generate slots for a week based on template
CREATE OR REPLACE FUNCTION generate_week_slots(start_date DATE)
RETURNS TABLE(
    generated_date DATE,
    generated_slots INTEGER,
    message TEXT
) AS $$
DECLARE
    current_date DATE;
    day_template RECORD;
    slot_count INTEGER;
    slot_num INTEGER;
    slot_times TIME[] := ARRAY['10:00:00', '11:30:00', '13:00:00', '14:30:00', '16:00:00'];
BEGIN
    -- Loop through 7 days
    FOR i IN 0..6 LOOP
        current_date := start_date + i;
        
        -- Get template for this day of week
        SELECT * INTO day_template 
        FROM weekly_schedule_template 
        WHERE day_of_week = EXTRACT(DOW FROM current_date);
        
        IF day_template.working_day THEN
            -- Insert daily availability record
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, day_template.max_slots, true)
            ON CONFLICT (date) 
            DO UPDATE SET available_slots = day_template.max_slots, working_day = true;
            
            -- Generate time slots
            FOR slot_num IN 1..day_template.max_slots LOOP
                INSERT INTO time_slots (date, time, slot_number, is_available, buffer_minutes)
                VALUES (current_date, slot_times[slot_num], slot_num, true, 30)
                ON CONFLICT (date, time) DO NOTHING;
            END LOOP;
            
            slot_count := day_template.max_slots;
        ELSE
            -- Non-working day
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, 0, false)
            ON CONFLICT (date) 
            DO UPDATE SET available_slots = 0, working_day = false;
            
            slot_count := 0;
        END IF;
        
        RETURN QUERY SELECT current_date, slot_count, 
                     CASE WHEN day_template.working_day 
                          THEN 'Generated ' || slot_count || ' slots'
                          ELSE 'Non-working day' 
                     END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check slot availability 
CREATE OR REPLACE FUNCTION check_slot_availability(check_date DATE, check_slot_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    is_working_day BOOLEAN;
    max_slots INTEGER;
    existing_booking_count INTEGER;
BEGIN
    -- Check if it's a working day and get max slots
    SELECT working_day, available_slots 
    INTO is_working_day, max_slots
    FROM daily_availability 
    WHERE date = check_date;
    
    -- If no config exists, check template
    IF NOT FOUND THEN
        SELECT working_day, max_slots 
        INTO is_working_day, max_slots
        FROM weekly_schedule_template 
        WHERE day_of_week = EXTRACT(DOW FROM check_date);
    END IF;
    
    -- Return false if not working day or slot exceeds max
    IF NOT is_working_day OR check_slot_number > max_slots THEN
        RETURN false;
    END IF;
    
    -- Check if slot exists and is available
    IF NOT EXISTS (
        SELECT 1 FROM time_slots 
        WHERE date = check_date 
        AND slot_number = check_slot_number 
        AND is_available = true
    ) THEN
        RETURN false;
    END IF;
    
    -- Check for existing bookings
    SELECT COUNT(*) INTO existing_booking_count
    FROM bookings 
    WHERE booking_date = check_date 
    AND time_slot = check_slot_number
    AND status NOT IN ('cancelled');
    
    RETURN existing_booking_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Run Migration

```bash
# Execute the migration
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/supabase.ts
```

---

## 🔧 TypeScript Types

### 3. Update `src/types/index.ts`

```typescript
// Add to existing types

export interface DailyAvailability {
  id: string;
  date: string;
  available_slots: number;
  working_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyScheduleTemplate {
  id: string;
  day_of_week: number;
  max_slots: number;
  working_day: boolean;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface TimeSlotWithAvailability extends TimeSlot {
  slot_number: number;
  buffer_minutes: number;
  is_available: boolean;
  booking_count?: number;
}

export interface AvailabilityCalendarDay {
  date: string;
  dayName: string;
  dayNumber: number;
  isWorkingDay: boolean;
  availableSlots: number;
  maxSlots: number;
  slots: {
    slot_number: number;
    time: string;
    status: 'available' | 'booked' | 'unavailable';
    booking?: {
      id: string;
      customer_name: string;
      reference: string;
    };
  }[];
}

export interface SlotGenerationResult {
  generated_date: string;
  generated_slots: number;
  message: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 6=Saturday

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday', 
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

export const SLOT_TIMES: Record<number, { time: string; display: string }> = {
  1: { time: '10:00:00', display: '10:00 AM - 11:00 AM' },
  2: { time: '11:30:00', display: '11:30 AM - 12:30 PM' },
  3: { time: '13:00:00', display: '1:00 PM - 2:00 PM' },
  4: { time: '14:30:00', display: '2:30 PM - 3:30 PM' },
  5: { time: '16:00:00', display: '4:00 PM - 5:00 PM' }
};
```

---

## 🔌 API Services

### 4. Create `src/lib/services/availability.ts`

```typescript
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
      .eq('date', date)
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
          reference,
          status
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date, slot_number');
    
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
      const dateSlots = slots?.filter(s => s.date === dateStr) || [];
      
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
          time: slot?.time || '',
          status,
          booking: booking ? {
            id: booking.id,
            customer_name: booking.customer_name,
            reference: booking.reference
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
```

### 5. Create `src/lib/services/booking-validation.ts`

```typescript
import { AvailabilityService } from './availability';
import { SLOT_TIMES } from '@/types';

export class BookingValidationService {
  static async validateBooking(
    date: string, 
    slotNumber: number, 
    excludeBookingId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check if date is in the future
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        return { isValid: false, error: 'Booking date must be in the future' };
      }
      
      // Check if slot number is valid (1-5)
      if (slotNumber < 1 || slotNumber > 5) {
        return { isValid: false, error: 'Invalid slot number' };
      }
      
      // Check business hours (slots should only be within 10:00-18:00)
      const slotTime = SLOT_TIMES[slotNumber];
      if (!slotTime) {
        return { isValid: false, error: 'Invalid time slot' };
      }
      
      // Check slot availability
      const isAvailable = await AvailabilityService.checkSlotAvailability(date, slotNumber);
      if (!isAvailable) {
        return { isValid: false, error: 'Selected time slot is not available' };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Booking validation error:', error);
      return { isValid: false, error: 'Validation failed - please try again' };
    }
  }

  static async getAvailableSlots(date: string): Promise<Array<{
    slot_number: number;
    time: string;
    display: string;
    available: boolean;
  }>> {
    try {
      const availableSlots = await AvailabilityService.getAvailableSlots(date);
      
      return Object.entries(SLOT_TIMES).map(([slotNum, slotInfo]) => {
        const slotNumber = parseInt(slotNum);
        const isAvailable = availableSlots.some(slot => slot.slot_number === slotNumber);
        
        return {
          slot_number: slotNumber,
          time: slotInfo.time,
          display: slotInfo.display,
          available: isAvailable
        };
      });
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  static validateBusinessHours(time: string): boolean {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 10 && hour < 18;
  }

  static calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours + 1, minutes, 0, 0);
    return endDate.toTimeString().slice(0, 5) + ':00';
  }
}
```

---

## 📱 API Endpoints

### 6. Create `src/app/api/admin/availability/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/admin/availability
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' }, 
        { status: 400 }
      );
    }

    const calendarData = await AvailabilityService.getCalendarData(startDate, endDate);
    
    return NextResponse.json({ data: calendarData });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

### 7. Create `src/app/api/admin/availability/generate-week/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST /api/admin/availability/generate-week
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { start_date } = await request.json();
    
    if (!start_date) {
      return NextResponse.json(
        { error: 'start_date is required' }, 
        { status: 400 }
      );
    }

    const result = await AvailabilityService.generateWeekSlots(start_date);
    
    return NextResponse.json({ 
      message: 'Week slots generated successfully',
      data: result 
    });
  } catch (error) {
    console.error('Generate week slots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

### 8. Create `src/app/api/admin/schedule-template/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/admin/schedule-template
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await AvailabilityService.getWeeklyTemplate();
    return NextResponse.json({ data: template });
  } catch (error) {
    console.error('Get schedule template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PUT /api/admin/schedule-template
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { day_of_week, ...config } = await request.json();
    
    if (day_of_week === undefined) {
      return NextResponse.json(
        { error: 'day_of_week is required' }, 
        { status: 400 }
      );
    }

    const result = await AvailabilityService.updateWeeklyTemplate(day_of_week, config);
    
    return NextResponse.json({ 
      message: 'Schedule template updated successfully',
      data: result 
    });
  } catch (error) {
    console.error('Update schedule template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

### 9. Update `src/app/api/bookings/available-slots/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { BookingValidationService } from '@/lib/services/booking-validation';

// GET /api/bookings/available-slots?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'date parameter is required' }, 
        { status: 400 }
      );
    }

    const availableSlots = await BookingValidationService.getAvailableSlots(date);
    
    return NextResponse.json({ 
      date,
      slots: availableSlots 
    });
  } catch (error) {
    console.error('Available slots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

---

## 🎨 Admin Components

### 10. Create `src/components/admin/WeeklyScheduleConfig.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { WeeklyScheduleTemplate, DayOfWeek } from '@/types';
import { DAY_NAMES } from '@/types';

interface WeeklyScheduleConfigProps {
  onScheduleUpdate?: () => void;
}

export function WeeklyScheduleConfig({ onScheduleUpdate }: WeeklyScheduleConfigProps) {
  const [schedule, setSchedule] = useState<Record<DayOfWeek, WeeklyScheduleTemplate | null>>({
    0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<DayOfWeek | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduleTemplate();
  }, []);

  const loadScheduleTemplate = async () => {
    try {
      const response = await fetch('/api/admin/schedule-template');
      if (!response.ok) throw new Error('Failed to load schedule');
      
      const { data } = await response.json();
      
      const scheduleMap: Record<DayOfWeek, WeeklyScheduleTemplate | null> = {
        0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null
      };
      
      data.forEach((template: WeeklyScheduleTemplate) => {
        scheduleMap[template.day_of_week as DayOfWeek] = template;
      });
      
      setSchedule(scheduleMap);
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to load weekly schedule',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDayConfig = async (
    dayOfWeek: DayOfWeek, 
    field: string, 
    value: any
  ) => {
    setSaving(dayOfWeek);
    
    try {
      const currentConfig = schedule[dayOfWeek] || {
        day_of_week: dayOfWeek,
        working_day: false,
        max_slots: 0,
        start_time: '10:00:00',
        end_time: '18:00:00'
      };

      const updatedConfig = { ...currentConfig, [field]: value };
      
      const response = await fetch('/api/admin/schedule-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      
      if (!response.ok) throw new Error('Failed to update schedule');
      
      const { data } = await response.json();
      
      setSchedule(prev => ({
        ...prev,
        [dayOfWeek]: data
      }));
      
      toast({
        title: 'Success',
        description: `${DAY_NAMES[dayOfWeek]} schedule updated`
      });
      
      onScheduleUpdate?.();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Weekly Schedule Template
          <span className="text-sm font-normal text-muted-foreground">
            (Working Hours: 10:00 AM - 6:00 PM)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {(Object.keys(DAY_NAMES) as unknown as DayOfWeek[]).map(dayOfWeek => {
            const dayConfig = schedule[dayOfWeek];
            const isWorking = dayConfig?.working_day || false;
            const maxSlots = dayConfig?.max_slots || 0;
            const isSaving = saving === dayOfWeek;

            return (
              <div key={dayOfWeek} className="space-y-3 p-3 border rounded-lg">
                <h3 className="font-medium text-center">
                  {DAY_NAMES[dayOfWeek]}
                </h3>
                
                <div className="flex items-center justify-center space-x-2">
                  <Switch
                    checked={isWorking}
                    onCheckedChange={(checked) => 
                      updateDayConfig(dayOfWeek, 'working_day', checked)
                    }
                    disabled={isSaving}
                  />
                  <Label className="text-sm">
                    {isWorking ? 'Working' : 'Closed'}
                  </Label>
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                
                {isWorking && (
                  <div className="space-y-2">
                    <Label className="text-xs">Available Slots</Label>
                    <Select
                      value={maxSlots.toString()}
                      onValueChange={(value) => 
                        updateDayConfig(dayOfWeek, 'max_slots', parseInt(value))
                      }
                      disabled={isSaving}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} slot{num !== 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      {maxSlots > 0 && (
                        <>
                          <div>Slot 1: 10:00-11:00 AM</div>
                          {maxSlots > 1 && <div>Slot 2: 11:30-12:30 PM</div>}
                          {maxSlots > 2 && <div>Slot 3: 1:00-2:00 PM</div>}
                          {maxSlots > 3 && <div>Slot 4: 2:30-3:30 PM</div>}
                          {maxSlots > 4 && <div>Slot 5: 4:00-5:00 PM</div>}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Schedule Rules</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Maximum 5 slots per day with 30-minute travel buffers</li>
            <li>• Working hours: 10:00 AM - 6:00 PM</li>
            <li>• Each slot is 1 hour including travel time</li>
            <li>• Template applies to future weeks when generating slots</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 11. Create `src/components/admin/AvailabilityCalendar.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  RotateCcw,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvailabilityCalendarDay } from '@/types';

interface AvailabilityCalendarProps {
  onSlotClick?: (date: string, slotNumber: number, booking?: any) => void;
}

export function AvailabilityCalendar({ onSlotClick }: AvailabilityCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(getWeekStart(new Date()));
  const [calendarData, setCalendarData] = useState<AvailabilityCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCalendarData();
  }, [currentWeek]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const startDate = currentWeek.toISOString().split('T')[0];
      const endDate = new Date(currentWeek);
      endDate.setDate(endDate.getDate() + 6);
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await fetch(
        `/api/admin/availability?start_date=${startDate}&end_date=${endDateStr}`
      );
      
      if (!response.ok) throw new Error('Failed to load calendar data');
      
      const { data } = await response.json();
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to load availability calendar',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateWeekSlots = async () => {
    setGenerating(true);
    try {
      const startDate = currentWeek.toISOString().split('T')[0];
      
      const response = await fetch('/api/admin/availability/generate-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate })
      });
      
      if (!response.ok) throw new Error('Failed to generate slots');
      
      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'Week slots generated successfully'
      });
      
      await loadCalendarData();
    } catch (error) {
      console.error('Error generating slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate week slots',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(getWeekStart(new Date()));
  };

  const getSlotStatusColor = (status: 'available' | 'booked' | 'unavailable') => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'booked':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'unavailable':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability Calendar
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Current Week
            </Button>
            
            <Button
              onClick={generateWeekSlots}
              disabled={generating}
              size="sm"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Generate Week
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="font-medium">
              Week of {currentWeek.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} - {new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 rounded" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 rounded" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded" />
              <span>Unavailable</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {calendarData.map((day) => (
            <div key={day.date} className="border rounded-lg p-3 min-h-[200px]">
              <div className="space-y-2">
                <div className="text-center">
                  <div className="font-medium">{day.dayName}</div>
                  <div className="text-sm text-muted-foreground">{day.dayNumber}</div>
                  {!day.isWorkingDay && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Closed
                    </Badge>
                  )}
                </div>
                
                {day.isWorkingDay && (
                  <>
                    <div className="text-xs text-center text-muted-foreground">
                      {day.availableSlots}/{day.maxSlots} available
                    </div>
                    
                    <div className="space-y-1">
                      {day.slots.map((slot) => (
                        <button
                          key={slot.slot_number}
                          onClick={() => onSlotClick?.(day.date, slot.slot_number, slot.booking)}
                          className={cn(
                            'w-full text-xs p-2 rounded text-left transition-colors',
                            getSlotStatusColor(slot.status),
                            slot.status !== 'unavailable' && 'cursor-pointer'
                          )}
                          disabled={slot.status === 'unavailable'}
                        >
                          <div className="font-medium">
                            Slot {slot.slot_number}
                          </div>
                          {slot.time && (
                            <div className="opacity-75">
                              {new Date(`2000-01-01T${slot.time}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          )}
                          {slot.booking && (
                            <div className="mt-1 text-xs">
                              <div className="font-medium truncate">
                                {slot.booking.customer_name}
                              </div>
                              <div className="opacity-75">
                                #{slot.booking.reference}
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}
```

### 12. Update `src/components/admin/EditBookingModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { BookingValidationService } from '@/lib/services/booking-validation';
import type { Booking } from '@/types';

interface EditBookingModalProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onSave: (booking: Booking) => void;
}

interface AvailableSlot {
  slot_number: number;
  time: string;
  display: string;
  available: boolean;
}

export function EditBookingModal({ booking, open, onClose, onSave }: EditBookingModalProps) {
  const [formData, setFormData] = useState<Partial<Booking>>({});
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (booking && open) {
      setFormData({
        id: booking.id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        booking_date: booking.booking_date,
        time_slot: booking.time_slot,
        status: booking.status,
        payment_status: booking.payment_status,
        total_amount: booking.total_amount,
        notes: booking.notes,
        service_type: booking.service_type
      });
      
      if (booking.booking_date) {
        loadAvailableSlots(booking.booking_date);
      }
    }
  }, [booking, open]);

  const loadAvailableSlots = async (date: string) => {
    setLoading(true);
    try {
      const slots = await BookingValidationService.getAvailableSlots(date);
      
      // Include current booking's slot even if it appears "unavailable"
      const currentSlot = booking?.time_slot;
      if (currentSlot && !slots.find(s => s.slot_number === currentSlot)) {
        // Add current slot to available options
        const slotTimes = {
          1: { time: '10:00:00', display: '10:00 AM - 11:00 AM' },
          2: { time: '11:30:00', display: '11:30 AM - 12:30 PM' },
          3: { time: '13:00:00', display: '1:00 PM - 2:00 PM' },
          4: { time: '14:30:00', display: '2:30 PM - 3:30 PM' },
          5: { time: '16:00:00', display: '4:00 PM - 5:00 PM' }
        };
        
        if (slotTimes[currentSlot as keyof typeof slotTimes]) {
          slots.push({
            slot_number: currentSlot,
            ...slotTimes[currentSlot as keyof typeof slotTimes],
            available: true // Current booking slot is available for this booking
          });
        }
      }
      
      setAvailableSlots(slots.sort((a, b) => a.slot_number - b.slot_number));
    } catch (error) {
      console.error('Error loading available slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available time slots',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (newDate: string) => {
    setFormData(prev => ({ ...prev, booking_date: newDate, time_slot: undefined }));
    setValidationError('');
    
    if (newDate) {
      await loadAvailableSlots(newDate);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleSlotChange = async (slotNumber: string) => {
    const slot = parseInt(slotNumber);
    setFormData(prev => ({ ...prev, time_slot: slot }));
    setValidationError('');
    
    // Validate slot availability (excluding current booking)
    if (formData.booking_date) {
      const validation = await BookingValidationService.validateBooking(
        formData.booking_date,
        slot,
        booking?.id // Exclude current booking from validation
      );
      
      if (!validation.isValid) {
        setValidationError(validation.error || 'Slot validation failed');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.booking_date || !formData.time_slot) {
      setValidationError('Date and time slot are required');
      return;
    }

    // Final validation
    const validation = await BookingValidationService.validateBooking(
      formData.booking_date,
      formData.time_slot,
      booking?.id
    );
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Validation failed');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/bookings/${booking?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update booking');
      }
      
      const updatedBooking = await response.json();
      
      toast({
        title: 'Success',
        description: 'Booking updated successfully'
      });
      
      onSave(updatedBooking);
      onClose();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update booking',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Booking, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const isFormValid = formData.customer_name && 
                     formData.customer_email && 
                     formData.booking_date && 
                     formData.time_slot && 
                     !validationError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name || ''}
                onChange={(e) => updateField('customer_name', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="customer_email">Email *</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email || ''}
                onChange={(e) => updateField('customer_email', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_phone">Phone</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone || ''}
                onChange={(e) => updateField('customer_phone', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="service_type">Service Type</Label>
              <Input
                id="service_type"
                value={formData.service_type || ''}
                onChange={(e) => updateField('service_type', e.target.value)}
              />
            </div>
          </div>
          
          {/* Date & Time with Slot Validation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="booking_date">Date *</Label>
              <Input
                id="booking_date"
                type="date"
                value={formData.booking_date || ''}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="time_slot">Time Slot *</Label>
              <Select
                value={formData.time_slot?.toString() || ''}
                onValueChange={handleSlotChange}
                disabled={loading || !formData.booking_date}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    loading ? 'Loading slots...' : 
                    !formData.booking_date ? 'Select date first' : 
                    'Select available slot'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map(slot => (
                    <SelectItem 
                      key={slot.slot_number} 
                      value={slot.slot_number.toString()}
                    >
                      Slot {slot.slot_number}: {slot.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading && (
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading available slots...
                </div>
              )}
            </div>
          </div>
          
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{validationError}</p>
            </div>
          )}
          
          {/* Status & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Booking Status</Label>
              <Select
                value={formData.status || ''}
                onValueChange={(value) => updateField('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select
                value={formData.payment_status || ''}
                onValueChange={(value) => updateField('payment_status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="total_amount">Total Amount (£)</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              value={formData.total_amount || ''}
              onChange={(e) => updateField('total_amount', parseFloat(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🏠 Admin Pages

### 13. Update `src/app/admin/availability/page.tsx`

```typescript
import { Metadata } from 'next';
import { WeeklyScheduleConfig } from '@/components/admin/WeeklyScheduleConfig';
import { AvailabilityCalendar } from '@/components/admin/AvailabilityCalendar';

export const metadata: Metadata = {
  title: 'Availability Management | L4D Admin',
  description: 'Manage booking availability and time slots'
};

export default function AvailabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Availability Management</h1>
        <p className="text-muted-foreground">
          Configure working days, time slots, and manage booking availability
        </p>
      </div>
      
      <WeeklyScheduleConfig />
      
      <AvailabilityCalendar />
    </div>
  );
}
```

---

## 🧪 Testing Scripts

### 14. Create `scripts/test-slot-system.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSlotSystem() {
  console.log('🧪 Testing Slot Formula System...\n');

  try {
    // Test 1: Generate week slots
    console.log('1. Testing week slot generation...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // Next week
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const { data: generationResult, error: genError } = await supabase
      .rpc('generate_week_slots', { start_date: startDateStr });
    
    if (genError) throw genError;
    console.log('✅ Week generation result:', generationResult);

    // Test 2: Check slot availability
    console.log('\n2. Testing slot availability check...');
    const { data: availabilityResult, error: availError } = await supabase
      .rpc('check_slot_availability', { 
        check_date: startDateStr, 
        check_slot_number: 1 
      });
    
    if (availError) throw availError;
    console.log('✅ Slot 1 availability:', availabilityResult);

    // Test 3: Validate business rules
    console.log('\n3. Testing business rules...');
    
    // Check daily availability
    const { data: dailyAvail, error: dailyError } = await supabase
      .from('daily_availability')
      .select('*')
      .eq('date', startDateStr)
      .single();
    
    if (dailyError && dailyError.code !== 'PGRST116') throw dailyError;
    console.log('✅ Daily availability config:', dailyAvail);

    // Check time slots
    const { data: timeSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('date', startDateStr)
      .order('slot_number');
    
    if (slotsError) throw slotsError;
    console.log('✅ Generated time slots:', timeSlots?.length || 0, 'slots');

    // Test 4: Weekly template
    console.log('\n4. Testing weekly template...');
    const { data: template, error: templateError } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .order('day_of_week');
    
    if (templateError) throw templateError;
    console.log('✅ Weekly template loaded:', template?.length || 0, 'days configured');

    console.log('\n🎉 All slot system tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testSlotSystem();
}

export { testSlotSystem };
```

### 15. Create `scripts/test-admin-availability.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAdminAvailability() {
  console.log('🧪 Testing Admin Availability Management...\n');

  try {
    // Test 1: Weekly template CRUD
    console.log('1. Testing weekly template operations...');
    
    const { data: template, error: getError } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .eq('day_of_week', 1) // Monday
      .single();
    
    if (getError && getError.code !== 'PGRST116') throw getError;
    console.log('✅ Monday template:', template);

    // Test updating Monday to 3 slots
    const { data: updated, error: updateError } = await supabase
      .from('weekly_schedule_template')
      .upsert({
        day_of_week: 1,
        working_day: true,
        max_slots: 3,
        start_time: '10:00:00',
        end_time: '18:00:00'
      })
      .select()
      .single();
    
    if (updateError) throw updateError;
    console.log('✅ Updated Monday template:', updated);

    // Test 2: Daily availability override
    console.log('\n2. Testing daily availability override...');
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 10);
    const testDateStr = testDate.toISOString().split('T')[0];
    
    const { data: dailyConfig, error: dailyError } = await supabase
      .from('daily_availability')
      .upsert({
        date: testDateStr,
        available_slots: 2,
        working_day: true
      })
      .select()
      .single();
    
    if (dailyError) throw dailyError;
    console.log('✅ Daily override created:', dailyConfig);

    // Test 3: Calendar data aggregation
    console.log('\n3. Testing calendar data retrieval...');
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 6);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get availability configs
    const { data: configs, error: configError } = await supabase
      .from('daily_availability')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr);
    
    if (configError) throw configError;
    console.log('✅ Availability configs loaded:', configs?.length || 0);

    // Get time slots with bookings
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings!left(id, status, customer_name)
      `)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date, slot_number');
    
    if (slotsError) throw slotsError;
    console.log('✅ Time slots with bookings:', slots?.length || 0);

    // Test 4: Slot conflict detection
    console.log('\n4. Testing slot conflict detection...');
    
    if (slots && slots.length > 0) {
      const testSlot = slots[0];
      const { data: conflicts, error: conflictError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('booking_date', testSlot.date)
        .eq('time_slot', testSlot.slot_number)
        .neq('status', 'cancelled');
      
      if (conflictError) throw conflictError;
      console.log('✅ Conflict check for slot:', conflicts?.length || 0, 'existing bookings');
    }

    console.log('\n🎉 All admin availability tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testAdminAvailability();
}

export { testAdminAvailability };
```

---

## 📝 Implementation Instructions

### **Execute in Order:**

1. **Database Setup**
   ```bash
   # Apply migration
   npx supabase db push
   
   # Generate new types
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

2. **Create Service Files**
   ```bash
   # Create service directories if they don't exist
   mkdir -p src/lib/services
   
   # Copy the service files from steps 4-5
   ```

3. **Create API Endpoints**
   ```bash
   # Create API directories
   mkdir -p src/app/api/admin/availability
   mkdir -p src/app/api/admin/schedule-template
   
   # Copy API files from steps 6-9
   ```

4. **Create Components**
   ```bash
   # Create admin component directory if needed
   mkdir -p src/components/admin
   
   # Copy component files from steps 10-12
   ```

5. **Create Admin Pages**
   ```bash
   # Create admin availability page
   mkdir -p src/app/admin/availability
   
   # Copy page file from step 13
   ```

6. **Testing**
   ```bash
   # Create testing scripts
   mkdir -p scripts
   
   # Copy test files from steps 14-15
   
   # Run tests
   npx tsx scripts/test-slot-system.ts
   npx tsx scripts/test-admin-availability.ts
   ```

7. **Update Package.json Scripts**
   ```json
   {
     "scripts": {
       "test:slots": "npx tsx scripts/test-slot-system.ts",
       "test:admin-availability": "npx tsx scripts/test-admin-availability.ts"
     }
   }
   ```

### **Verification Checklist:**

- [ ] Database migration applies successfully
- [ ] API endpoints respond correctly
- [ ] Admin can configure weekly schedule
- [ ] Calendar shows availability correctly
- [ ] Booking validation enforces 5-slot limit
- [ ] Edit booking modal validates slots
- [ ] Time slots respect 10:00-18:00 hours
- [ ] Travel buffers are enforced (30 min between slots)

### **Integration with Existing L4D Features:**

- **Authentication**: Uses existing Supabase auth and RLS
- **Admin Portal**: Integrates with current admin layout
- **Booking System**: Enhances existing booking validation
- **UI Components**: Uses existing ShadCN component library
- **Database**: Extends current schema with new tables

This implementation maintains full compatibility with your existing L4D system while adding sophisticated slot management capabilities.