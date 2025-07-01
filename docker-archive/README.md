# Docker Development Archive

This directory contains archived files from the local Docker-based development setup that was used before migrating to production Supabase.

## Contents

1. `supabase-docker-config.toml` - Original Docker configuration for local Supabase instance
2. `supabase-temp/` - Temporary files used by Docker containers
3. `supabase-tests/` - Test data and configurations for local testing

## Cleanup Actions Taken

1. Removed Docker volumes:
   - supabase_config_love4detailing-v2
   - supabase_db_love4detailing-v2
   - supabase_edge_runtime_love4detailing-v2
   - supabase_storage_love4detailing-v2

2. Archived configuration files:
   - Moved Docker-specific configuration to this directory
   - Preserved test data for reference

## Note

These files are kept for historical reference only. The project now uses production Supabase as the single source of truth. Do not attempt to use these files for local development.

For development:
1. Use the production Supabase instance
2. Follow the setup instructions in the main README
3. Use the test scripts in `/scripts` which are configured for production

## Migration Date

Archived on: June 2025 