TASK: Complete Legacy Database Code Cleanup

OBJECTIVE: Systematically scan and remove all references to old database tables, schemas, and components that are incompatible with the new 15-table database structure.


Latest Vercel Build Log:
https://nextjs.org/docs/messages/module-not-found
./src/app/admin/analytics/page.tsx
Module not found: Can't resolve '@/components/ui/card'
https://nextjs.org/docs/messages/module-not-found
./src/app/admin/analytics/page.tsx
Module not found: Can't resolve '@/components/ui/select'
https://nextjs.org/docs/messages/module-not-found
./src/app/admin/analytics/page.tsx
Module not found: Can't resolve '@/components/ui/alert'
https://nextjs.org/docs/messages/module-not-found
> Build failed because of webpack errors
Error: Command "npm run build" exited with 1


LEGACY ELEMENTS TO REMOVE:

OLD TABLE REFERENCES:
- time_slots (replaced by available_slots + schedule_slots)
- vehicle_sizes (replaced by service_pricing)
- daily_availability (replaced by schedule_templates)
- weekly_schedule_template (replaced by schedule_templates)
- rewards (replaced by customer_rewards)
- admin_notes (replaced by booking_notes)
- missing_vehicle_models (replaced by vehicle_model_registry)

OLD COLUMN REFERENCES:
- is_booked (replaced by is_available)
- dvla_data (deprecated feature)
- price_pence (replaced by base_price)
- total_price_pence (replaced by base_amount + additional_fees)

OLD COMPONENT PATTERNS:
- EditBookingModal (incompatible with new schema)
- WeeklyScheduleConfig (uses old scheduling system)
- PersonalDetailsStep (old booking flow)
- Any files in /booking/steps/ directory (old multi-step pattern)

CLEANUP INSTRUCTIONS:

1. SCAN FOR LEGACY REFERENCES:
```bash
# Find all files with old table references
grep -r "time_slots\|vehicle_sizes\|daily_availability\|weekly_schedule_template\|is_booked\|dvla_data\|price_pence" src/ --include="*.tsx" --include="*.ts" -l

# Find old component imports
grep -r "EditBookingModal\|WeeklyScheduleConfig\|PersonalDetailsStep" src/ --include="*.tsx" -l

# Find old API endpoints
find src/app/api -name "*.ts" | xargs grep -l "time_slots\|vehicle_sizes\|is_booked"

BACKUP BEFORE CLEANUP:

bashgit checkout -b cleanup-legacy-$(date +%Y%m%d)
git add . && git commit -m "Backup before legacy cleanup"

REMOVE LEGACY FILES:


Delete any files in src/components/booking/steps/ directory
Remove components that reference old schema extensively
Delete API routes that use deprecated table names
Remove any migration files or scripts referencing old structure


UPDATE IMPORTS AND REFERENCES:


Remove imports of deleted components
Update any remaining references to use new table names
Fix any broken import paths after file deletions


CLEAN UP TYPE DEFINITIONS:


Remove old interface definitions for deprecated tables
Update type imports to match new schema
Remove unused type definitions


VALIDATE CLEANUP:

bash# Ensure no legacy references remain
grep -r "time_slots\|vehicle_sizes\|is_booked\|dvla_data" src/ --include="*.tsx" --include="*.ts"

# Check build passes
npm run build

# Verify no module resolution errors
npm run lint
SPECIFIC FILES TO REVIEW/REMOVE:

src/components/admin/EditBookingModal.tsx (if heavily references old schema)
src/components/admin/WeeklyScheduleConfig.tsx (if uses old scheduling)
src/app/(public)/booking/vehicle/page.tsx (if references old structure)
Any files in src/components/booking/steps/ (old booking flow)
Old API routes in src/app/api/ that reference deprecated tables

PRESERVATION RULES:

Keep files that can be easily updated to new schema
Preserve core business logic that's still valid
Keep UI components that don't depend on database structure
Maintain authentication and layout components

SUCCESS CRITERIA:

No grep results for old table names in active code
npm run build completes without module errors
No references to is_booked, dvla_data, or price_pence
All imports resolve correctly
Codebase only references the new 15-table structure

FINAL VALIDATION:
Run these commands to confirm cleanup is complete:
bashgrep -r "time_slots\|vehicle_sizes\|daily_availability\|weekly_schedule_template\|is_booked\|dvla_data" src/
# Should return no results

npm run build
# Should complete successfully

git status
# Review deleted files to ensure nothing important was removed