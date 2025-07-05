-- Create sequence for booking references
create sequence if not exists booking_reference_seq
  minvalue 1
  maxvalue 9999
  cycle; 