-- Remove dvla_data column from vehicles table
ALTER TABLE vehicles DROP COLUMN IF EXISTS dvla_data; 