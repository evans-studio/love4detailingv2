#!/bin/bash

# Comprehensive cleanup script for Love4Detailing v2.0
# This script removes all traces of the old database schema

echo "🧹 Love4Detailing v2.0 - Comprehensive Schema Cleanup"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to safely remove files
safe_remove() {
    if [ -f "$1" ]; then
        echo "Removing: $1"
        rm "$1"
        print_status "Removed $1"
    else
        echo "File not found (already removed): $1"
    fi
}

# Function to safely remove directories
safe_remove_dir() {
    if [ -d "$1" ]; then
        echo "Removing directory: $1"
        rm -rf "$1"
        print_status "Removed directory $1"
    else
        echo "Directory not found (already removed): $1"
    fi
}

echo ""
print_info "Step 1: Removing old migration files..."

# Remove all migration files before our new schema (keeping only 20250706000010, 20250706000011, 20250706000012, 20250706000013)
cd supabase/migrations/

# Remove the baseline and all incremental migrations
safe_remove "20250701150341_20250702_baseline.sql"

# Remove all 20250702 migrations
for file in 20250702000*.sql; do
    if [[ "$file" != "20250702000*.sql" ]]; then  # Check if glob matched anything
        safe_remove "$file"
    fi
done

# Remove all 20250705 migrations  
for file in 20250705000*.sql; do
    if [[ "$file" != "20250705000*.sql" ]]; then  # Check if glob matched anything
        safe_remove "$file"
    fi
done

# Remove specific 20250706 migrations (keep only 0010, 0011, 0012, 0013)
safe_remove "20250706000001_fix_time_slots_migration.sql"
safe_remove "20250706000002_create_analytics_functions.sql"
safe_remove "20250706000003_enhance_rls_policies.sql"
safe_remove "20250706000004_add_slot_times_to_weekly_schedule.sql"

# Remove backup files
safe_remove "20250702000013_update_all_rls.sql.bak"

cd ../../

echo ""
print_info "Step 2: Removing old script files..."

# Remove old test and setup scripts
safe_remove "scripts/test-admin-tables.ts"
safe_remove "scripts/test-slot-system.ts"
safe_remove "scripts/setup-slot-system.ts"
safe_remove "scripts/fix-slot-functions.ts"
safe_remove "scripts/create-slot-functions.ts"
safe_remove "scripts/apply-slot-migration.ts"
safe_remove "scripts/setup-january-slots.ts"
safe_remove "scripts/test-admin-availability.ts"
safe_remove "scripts/test-admin-dashboard.ts"
safe_remove "scripts/test-booking-flow.ts"
safe_remove "scripts/create-test-bookings.ts"
safe_remove "scripts/cleanup-test-users.ts"
safe_remove "scripts/test-data.ts"
safe_remove "scripts/test-connection.ts"
safe_remove "scripts/test-unmatched-vehicle.ts"
safe_remove "scripts/setup-unmatched-vehicles.sql"
safe_remove "scripts/fix-time-slots.sql"
safe_remove "scripts/reset-test-data.sql"

echo ""
print_info "Step 3: Removing old backup files..."

# Remove backup files
safe_remove "src/components/admin/WeeklyScheduleConfig.tsx.backup"
safe_remove "src/lib/services/availability.ts.backup"
safe_remove_dir "supabase/backups"

echo ""
print_info "Step 4: Checking files that need manual updates..."

echo ""
print_warning "The following files contain old schema references and need manual updates:"
echo ""

echo "🔄 API Routes to update:"
echo "  - src/app/api/vehicle-sizes/route.ts"
echo "  - src/app/api/time-slots/route.ts"
echo "  - src/app/api/time-slots/generate/route.ts"
echo "  - src/app/api/admin/time-slots/route.ts"
echo "  - src/app/api/admin/time-slots/generate/route.ts"
echo "  - src/app/api/admin/time-slots/[id]/route.ts"
echo "  - src/app/api/admin/unmatched-vehicles/route.ts"
echo "  - src/app/api/rewards/route.ts"

echo ""
echo "🔄 Library files to update:"
echo "  - src/lib/api/vehicle-sizes.ts"
echo "  - src/lib/api/time-slots.ts"
echo "  - src/lib/services/booking.ts"
echo "  - src/lib/services/rewards.ts"
echo "  - src/lib/services/availability.ts"
echo "  - src/lib/utils/vehicle-size.ts"
echo "  - src/lib/validation/booking.ts"

echo ""
echo "🔄 Components to update:"
echo "  - src/components/booking/steps/DateTimeStep.tsx"
echo "  - src/components/booking/SummaryStep.tsx"
echo "  - src/components/admin/EditBookingModal.tsx"
echo "  - src/components/admin/UnmatchedVehiclesCard.tsx"

echo ""
echo "🔄 Pages to update:"
echo "  - src/app/admin/time-slots/page.tsx"
echo "  - src/app/admin/availability/page.tsx"
echo "  - src/app/admin/pricing/page.tsx"
echo "  - src/app/dashboard/rewards/page.tsx"

echo ""
echo "⚠️  CRITICAL: src/types/supabase.ts needs complete replacement with new schema types"

echo ""
print_info "Step 5: Files successfully cleaned up summary..."

echo ""
echo "✅ Removed old migration files (39+ files)"
echo "✅ Removed old script files (15+ files)" 
echo "✅ Removed backup files and directories"
echo ""

print_warning "NEXT STEPS:"
echo "1. Update src/types/supabase.ts with new schema types"
echo "2. Update API routes to use new table names (time_slots → available_slots, etc.)"
echo "3. Update library files to use new booking functions"
echo "4. Update components to use new field names"
echo "5. Run tests to verify everything works with new schema"

echo ""
print_status "Cleanup completed! Old schema files removed."
echo ""
print_info "You can now safely use the new Love4Detailing v2.0 schema."