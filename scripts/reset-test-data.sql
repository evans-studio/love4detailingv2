-- Begin transaction
BEGIN;

-- Disable triggers temporarily to avoid validation issues
ALTER TABLE bookings DISABLE TRIGGER ALL;
ALTER TABLE time_slots DISABLE TRIGGER ALL;
ALTER TABLE vehicles DISABLE TRIGGER ALL;
ALTER TABLE users DISABLE TRIGGER ALL;

-- Delete data from tables in correct order to respect foreign key constraints
DELETE FROM bookings;
DELETE FROM time_slots;
DELETE FROM vehicles;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE booking_reference_seq RESTART WITH 1;

-- Re-enable triggers
ALTER TABLE bookings ENABLE TRIGGER ALL;
ALTER TABLE time_slots ENABLE TRIGGER ALL;
ALTER TABLE vehicles ENABLE TRIGGER ALL;
ALTER TABLE users ENABLE TRIGGER ALL;

-- Generate new time slots for the next 14 days
WITH RECURSIVE dates AS (
  SELECT 
    CURRENT_DATE + 1 as slot_date
  UNION ALL
  SELECT 
    slot_date + 1
  FROM dates
  WHERE slot_date < CURRENT_DATE + 14
),
times AS (
  SELECT unnest(ARRAY[
    '10:00:00',
    '11:30:00',
    '13:00:00',
    '14:30:00',
    '16:00:00'
  ]::time[]) as slot_time
)
INSERT INTO time_slots (slot_date, slot_time, is_booked)
SELECT 
  d.slot_date,
  t.slot_time,
  false
FROM dates d
CROSS JOIN times t
WHERE EXTRACT(DOW FROM d.slot_date) != 0  -- Skip Sundays
ORDER BY d.slot_date, t.slot_time;

-- Verify the reset
SELECT 'time_slots' as table_name, COUNT(*) as count FROM time_slots
UNION ALL
SELECT 'bookings' as table_name, COUNT(*) as count FROM bookings
UNION ALL
SELECT 'vehicles' as table_name, COUNT(*) as count FROM vehicles
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users;

-- Show sample of new time slots
SELECT 
    slot_date,
    slot_time,
    is_booked
FROM time_slots
ORDER BY slot_date, slot_time
LIMIT 5;

COMMIT; 