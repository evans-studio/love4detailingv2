# Database Schema Fix

The migration file (clean_schema.sql) is correct and well-structured. The issues are in the seed.sql file. Here's the corrected seed data:

```sql
-- Insert test admin user
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000000', 'admin@love4detailing.com');

insert into public.users (id, email, first_name, last_name, phone, role)
values (
  '00000000-0000-0000-0000-000000000000',
  'admin@love4detailing.com',
  'Admin',
  'User',
  '+44123456789',
  'admin'
);

-- Insert test customer
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'test@example.com');

insert into public.users (id, email, first_name, last_name, phone, address_line1, city, postcode, role)
values (
  '11111111-1111-1111-1111-111111111111',
  'test@example.com',
  'John',
  'Doe',
  '+44987654321',
  '123 Test Street',
  'London',
  'SW1A 1AA',
  'authenticated'
);

-- Insert test vehicle for customer
insert into public.vehicles (
  user_id,
  registration,
  make,
  model,
  year,
  vehicle_size_id,
  color,
  dvla_data
)
select
  '11111111-1111-1111-1111-111111111111',
  'AB12CDE',
  'BMW',
  'M3',
  2022,
  vs.id,
  'Alpine White',
  '{"make":"BMW","model":"M3","yearOfManufacture":2022,"colour":"Alpine White"}'::jsonb
from public.vehicle_sizes vs
where vs.label = 'Large';

-- Insert time slots for the next 14 days
with dates as (
  select generate_series(
    current_date,
    current_date + interval '14 days',
    interval '1 day'
  )::date as slot_date
)
insert into public.time_slots (slot_date, slot_time, is_available)
select 
  d.slot_date,
  t.slot_time,
  true
from dates d
cross join (
  values 
    ('10:00:00'::time),
    ('11:30:00'::time),
    ('13:00:00'::time),
    ('14:30:00'::time),
    ('16:00:00'::time)
) as t(slot_time)
where extract(dow from d.slot_date) != 0 -- Skip Sundays
on conflict (slot_date, slot_time) do nothing;

-- Insert test booking
insert into public.bookings (
  user_id,
  vehicle_id,
  time_slot_id,
  vehicle_size_id,
  price_snapshot_pence,
  booking_reference,
  status,
  payment_status,
  notes
)
select
  '11111111-1111-1111-1111-111111111111',
  v.id,
  ts.id,
  vs.id,
  vs.price_pence,
  'TEST-' || substr(md5(random()::text), 1, 8),
  'pending',
  'pending',
  'Test booking'
from 
  public.vehicles v,
  public.time_slots ts,
  public.vehicle_sizes vs
where 
  v.registration = 'AB12CDE'
  and ts.slot_date = current_date + interval '1 day'
  and ts.slot_time = '10:00:00'
  and vs.label = 'Large'
limit 1;

-- Insert test admin note
insert into public.admin_notes (
  booking_id,
  note
)
select
  b.id,
  'Test admin note for booking'
from public.bookings b
where b.booking_reference like 'TEST-%'
limit 1;
```

## Changes Made:

1. Removed references to non-existent tables and columns:
   - Removed old `services` table insertions
   - Removed `loyalty_points` table insertions
   - Fixed column names in `time_slots` table (`slot_date` and `slot_time`)

2. Fixed data consistency:
   - Used consistent UUIDs for test users
   - Properly referenced vehicle_sizes through foreign keys
   - Added proper JSONB data for dvla_data column
   - Fixed booking insertions to use correct foreign keys and columns

3. Added proper test data:
   - Created a complete flow of test data (user → vehicle → booking → admin note)
   - Used proper enums for status fields
   - Generated proper booking references

## Instructions:

1. The migration file (clean_schema.sql) is correct and should be run first
2. After the migration completes successfully, run this corrected seed data
3. The seed data creates:
   - An admin user
   - A test customer
   - A test vehicle for the customer
   - Time slots for the next 14 days
   - A test booking
   - A test admin note

## Verification Queries:

After running the seed, you can verify the data with these queries:

```sql
-- Check users
select * from public.users;

-- Check time slots
select * from public.time_slots where slot_date >= current_date order by slot_date, slot_time limit 5;

-- Check test booking
select 
  b.booking_reference,
  u.email as customer_email,
  v.registration,
  ts.slot_date,
  ts.slot_time,
  vs.label as vehicle_size,
  b.price_snapshot_pence
from public.bookings b
join public.users u on u.id = b.user_id
join public.vehicles v on v.id = b.vehicle_id
join public.time_slots ts on ts.id = b.time_slot_id
join public.vehicle_sizes vs on vs.id = b.vehicle_size_id;
```

# Schema Fix Instructions

The base schema is correct, but we need to add additional RLS policies and some missing functionality. Apply these changes after the existing schema:

## 1. Additional RLS Policies

```sql
-- Admin policies for all tables
create policy "Admins can read all data"
  on public.users for select
  using (auth.uid() in (select id from public.users where role = 'admin'::user_role));

create policy "Admins can insert all data"
  on public.users for insert
  using (auth.uid() in (select id from public.users where role = 'admin'::user_role));

create policy "Admins can update all data"
  on public.users for update
  using (auth.uid() in (select id from public.users where role = 'admin'::user_role));

create policy "Admins can delete all data"
  on public.users for delete
  using (auth.uid() in (select id from public.users where role = 'admin'::user_role));

-- Repeat the above policies for vehicles, bookings, and time_slots tables
-- Example for vehicles:
create policy "Admins can read all vehicles"
  on public.vehicles for select
  using (auth.uid() in (select id from public.users where role = 'admin'::user_role));

-- Add similar policies for other tables...

-- Time slots management policies
create policy "Admins can manage time slots"
  on public.time_slots for all
  using (auth.uid() in (select id from public.users where role = 'admin'::user_role));

-- Booking deletion policies
create policy "Users can cancel own bookings"
  on public.bookings for delete
  using (auth.uid() = user_id and status = 'pending');

-- Admin notes management
create policy "Admins can manage notes"
  on public.admin_notes for all
  using (auth.uid() in (select id from public.users where role = 'admin'::user_role));
```

## 2. Additional Functions and Triggers

```sql
-- Function to validate booking times
create or replace function validate_booking_time()
returns trigger as $$
begin
  -- Ensure booking is not in the past
  if NEW.slot_date < current_date then
    raise exception 'Cannot book appointments in the past';
  end if;
  
  -- If booking is for today, ensure time hasn't passed
  if NEW.slot_date = current_date and NEW.slot_time <= current_time then
    raise exception 'Cannot book appointments for times that have already passed';
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger for booking time validation
create trigger validate_booking_time_trigger
  before insert or update on public.time_slots
  for each row
  execute function validate_booking_time();

-- Function to generate booking reference
create or replace function generate_booking_reference()
returns trigger as $$
begin
  NEW.booking_reference = 'BK-' || to_char(NEW.created_at, 'YYYYMMDD') || '-' || 
    substr(md5(NEW.id::text), 1, 6);
  return NEW;
end;
$$ language plpgsql;

-- Create trigger for booking reference generation
create trigger generate_booking_reference_trigger
  before insert on public.bookings
  for each row
  execute function generate_booking_reference();
```

## 3. Additional Indexes

```sql
-- Add indexes for common queries
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_payment_status_idx on public.bookings(payment_status);
create index if not exists time_slots_availability_idx on public.time_slots(is_available);
create index if not exists vehicles_size_id_idx on public.vehicles(vehicle_size_id);
```

## Instructions

1. First, verify that the base schema (clean_schema.sql) has been applied successfully
2. Then apply these additional changes in order:
   - Additional RLS policies
   - Functions and triggers
   - Additional indexes
3. Finally, verify the seed data runs without errors

## Verification Queries

After applying all changes, run these queries to verify the setup:

```sql
-- Check RLS policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- Check triggers
select 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement as definition
from information_schema.triggers
where trigger_schema = 'public'
order by table_name, trigger_name;

-- Check indexes
select 
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

## Common Issues and Solutions

1. If you see "relation does not exist" errors:
   - Make sure tables are created in the correct order (users → vehicle_sizes → vehicles → time_slots → bookings → admin_notes)
   - Verify all ENUMs are created before any table that uses them

2. If you see foreign key errors in seed data:
   - Ensure vehicle_sizes are inserted before any vehicles
   - Ensure users exist before inserting vehicles or bookings
   - Ensure time slots exist before creating bookings

3. If RLS policies fail:
   - Verify the auth.uid() function is available
   - Check that the users table has the role column properly set
   - Ensure admin users have the correct role value
``` 