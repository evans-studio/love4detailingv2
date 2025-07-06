-- Add slot time columns to weekly_schedule_template table
-- This enables ultra-flexible 15-minute precision scheduling

-- Add the missing slot time columns and updated_at if not exists
ALTER TABLE weekly_schedule_template 
ADD COLUMN IF NOT EXISTS slot_1_time TIME DEFAULT '10:00:00',
ADD COLUMN IF NOT EXISTS slot_2_time TIME DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS slot_3_time TIME DEFAULT '14:00:00',
ADD COLUMN IF NOT EXISTS slot_4_time TIME DEFAULT '16:00:00',
ADD COLUMN IF NOT EXISTS slot_5_time TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update existing records with default slot times
UPDATE weekly_schedule_template 
SET 
  slot_1_time = '10:00:00',
  slot_2_time = '12:00:00',
  slot_3_time = '14:00:00',
  slot_4_time = '16:00:00',
  slot_5_time = '18:00:00',
  updated_at = NOW()
WHERE slot_1_time IS NULL;

-- Add constraints to ensure slot times are within working hours
ALTER TABLE weekly_schedule_template
ADD CONSTRAINT weekly_schedule_slot_times_check 
CHECK (
  slot_1_time >= '08:00:00' AND slot_1_time <= '20:00:00' AND
  slot_2_time >= '08:00:00' AND slot_2_time <= '20:00:00' AND
  slot_3_time >= '08:00:00' AND slot_3_time <= '20:00:00' AND
  slot_4_time >= '08:00:00' AND slot_4_time <= '20:00:00' AND
  slot_5_time >= '08:00:00' AND slot_5_time <= '20:00:00'
);