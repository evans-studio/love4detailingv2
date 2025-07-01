# Database Migrations Status

## Current State

### Backup
A complete backup of the current schema and data is stored in:
`/supabase/backups/20250701_schema_backup.sql`

This file contains:
- All table definitions
- Enum types
- Indexes
- RLS policies
- Functions and triggers
- Initial vehicle sizes data

### Active Migrations
1. `20240320000000_clean_schema.sql` (Historical reference only)
   - Base schema definition
   - ⚠️ Do not run - already applied manually

2. `20250701120214_add_rewards_system.sql` (Historical reference only)
   - Rewards system implementation
   - ⚠️ Do not run - already applied manually

3. `20250701150341_20250702_baseline.sql`
   - Registers previous manual migrations
   - ✅ Safe to run - only updates schema_migrations table

### Removed Migrations
- ❌ `20250701120325_fix_vehicle_sizes_and_add_rewards.sql`
  - Removed due to redundancy
  - Changes already manually applied

## Migration Strategy

### For Local Development
1. Use the backup file to set up your local database:
   ```bash
   # In SQL Editor
   \i supabase/backups/20250701_schema_backup.sql
   ```

2. Register migrations:
   ```bash
   # In SQL Editor
   \i supabase/migrations/20250701150341_20250702_baseline.sql
   ```

### For New Changes
1. Create new migrations:
   ```bash
   npx supabase migration new your_migration_name
   ```

2. Test locally:
   ```bash
   npx supabase db reset
   ```

3. Apply to production:
   ```bash
   npx supabase db push
   ```

### Important Notes
- ⚠️ Never run old migrations directly
- ✅ Always test migrations in a local environment first
- 📝 Keep the backup file updated when making manual changes
- 🔒 Ensure RLS policies are maintained
- 🔄 Use `IF NOT EXISTS` and `ON CONFLICT` clauses

## Troubleshooting

If you encounter issues:
1. Check the backup file for the current state
2. Compare with local schema
3. Use `\d table_name` in SQL Editor to verify structure
4. Check schema_migrations table for applied migrations 