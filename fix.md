You are now acting as the lead backend developer for the Love 4 Detailing booking system. Your objective is to eliminate all legacy service logic and refactor the database schema to support a vehicle-size-based pricing model — cleanly, clearly, and without unnecessary duplication.

⸻

🎯 What to do:

1. Stop and Clean Environment
	•	Stop all Supabase services and ensure Docker containers are not interfering.
	•	Delete all existing SQL migrations (/supabase/migrations/*) to prevent re-execution of stale logic.

2. Drop or Rename Outdated Tables
	•	Drop the current services table (if unused).
	•	If still required (e.g., for a future “Valet Tier” system), rename it to service_types and limit it to a single "Valet" record for now.

3. Rebuild from Clean Schema
	•	Create or reapply a single seed.sql or structured schema file that:
	•	Sets up users, vehicles, vehicle_sizes, time_slots, bookings, loyalty_points, admin_notes
	•	Adds a new table: vehicle_sizes
	•	Columns:
	•	id (uuid, primary)
	•	label (Small, Medium, Large, Extra Large)
	•	description
	•	price_pence (5500–7000)
	•	Optional: min_length, max_length, vehicle_category_match (for future DVLA logic)

4. Trigger Logic
	•	Delay the creation of BEFORE UPDATE triggers (like update_bookings_updated_at) until after their corresponding tables are confirmed created.
	•	If Supabase fails to apply a SQL trigger or function, write the failed SQL to a .sql.md file instead of skipping silently.

5. Reset and Reapply Schema
	•	Once schema file is confirmed, run:
    supabase db reset
supabase db seed --file ./seed.sql

Post-Reset Expectations:
	•	The only pricing logic should exist in the vehicle_sizes table.
	•	Bookings should link to:
	•	user_id
	•	vehicle_id
	•	vehicle_size_id
	•	The UI form flow should reference vehicle_size.price_pence for cost calculation — not the old services table.

⸻

📎 Append all new table definitions and sample seed data in a separate .sql.md file for review before reapplying migrations.

Take a step back and confirm database integrity and schema logic before resuming new feature development. Let me know once schema is clean and synced, and I’ll proceed with API and form logic updates.