-- Drop existing function
drop function if exists create_booking;

-- Create updated function with user profile data
create or replace function create_booking(
  p_user_id uuid,
  p_vehicle_id uuid,
  p_time_slot_id uuid,
  p_total_price_pence integer,
  p_email text,
  p_full_name text,
  p_phone text
) returns json
language plpgsql
security definer
as $$
declare
  v_booking_id uuid;
  v_time_slot record;
  v_vehicle record;
  v_booking_reference text;
begin
  -- Check if time slot exists and is available
  select * into v_time_slot
  from time_slots
  where id = p_time_slot_id
  for update;

  if not found then
    raise exception 'Time slot not found';
  end if;

  if v_time_slot.is_booked then
    raise exception 'Time slot is already booked';
  end if;

  -- Check if vehicle exists and belongs to user
  select * into v_vehicle
  from vehicles
  where id = p_vehicle_id and user_id = p_user_id;

  if not found then
    raise exception 'Vehicle not found or does not belong to user';
  end if;

  -- Generate booking reference (e.g., L4D-2025-1234)
  select 'L4D-' || to_char(now(), 'YYYY') || '-' || 
         lpad(cast(nextval('booking_reference_seq') as text), 4, '0')
  into v_booking_reference;

  -- Create booking with user profile data
  insert into bookings (
    user_id,
    vehicle_id,
    time_slot_id,
    status,
    payment_status,
    payment_method,
    total_price_pence,
    booking_reference,
    email,
    full_name,
    phone
  ) values (
    p_user_id,
    p_vehicle_id,
    p_time_slot_id,
    'pending',
    'pending',
    'card',
    p_total_price_pence,
    v_booking_reference,
    p_email,
    p_full_name,
    p_phone
  )
  returning id into v_booking_id;

  -- Mark time slot as booked
  update time_slots
  set is_booked = true
  where id = p_time_slot_id;

  -- Return booking details
  return json_build_object(
    'id', v_booking_id,
    'booking_reference', v_booking_reference,
    'status', 'pending'
  );
end;
$$; 