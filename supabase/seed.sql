-- Insert test admin user
insert into auth.users (id, email, encrypted_password, email_confirmed_at)
values (
  '00000000-0000-0000-0000-000000000000',
  'admin@love4detailing.com',
  crypt('testPassword123!', gen_salt('bf')),
  now()
);

insert into public.users (id, email, full_name, phone, role)
values (
  '00000000-0000-0000-0000-000000000000',
  'admin@love4detailing.com',
  'Admin User',
  '+44123456789',
  'admin'
);

-- Insert test customer
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'test@example.com');

insert into public.users (id, email, full_name, phone, role)
values (
  '11111111-1111-1111-1111-111111111111',
  'test@example.com',
  'John Doe',
  '+44987654321',
  'customer'
);

-- Insert test vehicle for customer
insert into public.vehicles (
  user_id,
  registration,
  make,
  model,
  year,
  size_id,
  color,
  dvla_data
)
select
  '11111111-1111-1111-1111-111111111111',
  'AB12CDE',
  'BMW',
  'M3',
  '2022',
  vs.id,
  'Alpine White',
  '{"make":"BMW","model":"M3","yearOfManufacture":2022,"colour":"Alpine White"}'::jsonb
from public.vehicle_sizes vs
where vs.label = 'Large';

-- Insert time slots for the next 14 days, starting from tomorrow
with dates as (
  select generate_series(
    current_date + interval '1 day',
    current_date + interval '14 days',
    interval '1 day'
  )::date as slot_date
)
insert into public.time_slots (slot_date, slot_time)
select 
  d.slot_date,
  t.slot_time
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

-- Insert test booking for tomorrow
insert into public.bookings (
  user_id,
  vehicle_id,
  time_slot_id,
  total_price_pence,
  status,
  payment_status
)
select
  '11111111-1111-1111-1111-111111111111',
  v.id,
  ts.id,
  vs.price_pence,
  'pending',
  'pending'
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
where b.status = 'pending'
limit 1; 