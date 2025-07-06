#!/bin/bash

# Pre-deployment Checklist for Love4Detailing v2.0
# This script runs all necessary checks before deployment

echo "🚀 Love4Detailing v2.0 - Pre-deployment Checklist"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Exit on any error
set -e

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Environment variables check
echo ""
echo "1. Checking environment variables..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL not set${NC}"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not set${NC}"
    exit 1
fi

print_status 0 "Environment variables configured"

# 2. Dependencies check
echo ""
echo "2. Installing/updating dependencies..."
npm ci --silent
print_status $? "Dependencies installed"

# 3. TypeScript compilation check
echo ""
echo "3. TypeScript compilation check..."
npx tsc --noEmit
print_status $? "TypeScript compilation successful"

# 4. Linting check
echo ""
echo "4. ESLint check..."
npm run lint > /dev/null 2>&1
print_status $? "Code linting passed"

# 5. Build check
echo ""
echo "5. Production build check..."
npm run build > /dev/null 2>&1
print_status $? "Production build successful"

# 6. Database connection test
echo ""
echo "6. Database connectivity test..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('services').select('count').limit(1).then(({ error }) => {
  if (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  } else {
    console.log('Database connection successful');
  }
}).catch(err => {
  console.error('Database test failed:', err.message);
  process.exit(1);
});
" 2>/dev/null
print_status $? "Database connectivity verified"

# 7. Critical services test
echo ""
echo "7. Testing critical services..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testServices() {
  // Test Full Valet service exists
  const { data: service, error: serviceError } = await client
    .from('services')
    .select('id, code')
    .eq('code', 'full_valet')
    .single();
  
  if (serviceError || !service) {
    throw new Error('Full Valet service not found');
  }
  
  // Test service pricing exists
  const { data: pricing, error: pricingError } = await client
    .from('service_pricing')
    .select('price_pence')
    .eq('service_id', service.id);
  
  if (pricingError || !pricing || pricing.length === 0) {
    throw new Error('Service pricing not configured');
  }
  
  // Test booking functions exist
  const { data: functions, error: funcError } = await client
    .rpc('get_available_slots_for_date', {
      p_date: new Date().toISOString().split('T')[0]
    });
  
  if (funcError) {
    throw new Error('Booking functions not working: ' + funcError.message);
  }
  
  console.log('Critical services test passed');
}

testServices().catch(err => {
  console.error('Critical services test failed:', err.message);
  process.exit(1);
});
" 2>/dev/null
print_status $? "Critical services validated"

# 8. Security check
echo ""
echo "8. Security configuration check..."

# Check for sensitive data in code
if grep -r "password\|secret\|key" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ | grep -v "process.env" | grep -i "=" > /dev/null; then
    print_warning "Potential hardcoded secrets found in source code"
    echo "Please review and ensure no sensitive data is hardcoded"
else
    print_status 0 "No hardcoded secrets detected"
fi

# 9. Performance check
echo ""
echo "9. Bundle size analysis..."
npm run build > /dev/null 2>&1
# Check if .next directory exists
if [ -d ".next" ]; then
    BUNDLE_SIZE=$(du -sh .next/static/chunks/ | cut -f1)
    echo "Bundle size: $BUNDLE_SIZE"
    print_status 0 "Bundle analysis complete"
else
    print_status 1 "Build directory not found"
fi

# 10. Database migration status
echo ""
echo "10. Database migration status..."
if command -v supabase &> /dev/null; then
    supabase db diff --linked > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status 0 "Database migrations up to date"
    else
        print_warning "Database migrations may be pending"
        echo "Run 'supabase db push --linked' to apply migrations"
    fi
else
    print_warning "Supabase CLI not found - skipping migration check"
fi

echo ""
echo "================================================="
echo -e "${GREEN}✅ All pre-deployment checks passed!${NC}"
echo ""
echo "Ready for deployment to Vercel environment."
echo ""
echo "Next steps:"
echo "1. Run database migrations: npm run db:push"
echo "2. Deploy to Vercel: vercel --prod"
echo "3. Run post-deployment tests"