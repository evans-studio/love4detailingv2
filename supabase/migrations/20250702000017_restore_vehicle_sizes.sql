-- Delete any existing vehicle sizes to avoid conflicts
DELETE FROM vehicle_sizes;

-- Insert vehicle sizes
INSERT INTO vehicle_sizes (id, label, description, price_pence) VALUES
  ('027cbc8f-db2a-4856-9673-e5a17db2ac66', 'Medium', 'Medium-sized vehicles (e.g. BMW 3 Series, Audi A4)', 6000),
  ('1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d', 'Small', 'Small vehicles (e.g. Ford Fiesta, VW Polo)', 5000),
  ('2b3c4d5e-6f7a-4a8b-9c0d-2e3f4a5b6c7d', 'Large', 'Large vehicles (e.g. BMW 5 Series, Audi A6)', 7000),
  ('3c4d5e6f-7a8b-4a8b-9c0d-3e4f5a6b7c8d', 'Extra Large', 'Extra large vehicles (e.g. Range Rover, BMW X5)', 8000); 