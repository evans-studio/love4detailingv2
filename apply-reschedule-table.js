#!/usr/bin/env node

/**
 * Apply reschedule_requests table to database
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🗄️  CREATING RESCHEDULE REQUESTS TABLE')
console.log('=' .repeat(40))

async function createRescheduleTable() {
  try {
    console.log('📋 Creating reschedule_requests table...')
    
    // Create the table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create reschedule_requests table for proper reschedule notification tracking
        CREATE TABLE IF NOT EXISTS reschedule_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
            original_slot_id UUID REFERENCES available_slots(id) ON DELETE SET NULL,
            requested_slot_id UUID NOT NULL REFERENCES available_slots(id) ON DELETE CASCADE,
            reason TEXT,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
            requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
            admin_response TEXT,
            admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
            responded_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (createError) {
      console.error('❌ Failed to create table:', createError.message)
      return false
    }
    
    console.log('✅ Table created successfully')
    
    // Create indexes
    console.log('📋 Creating indexes...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking_id ON reschedule_requests(booking_id);
        CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer_id ON reschedule_requests(customer_id);
        CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);
        CREATE INDEX IF NOT EXISTS idx_reschedule_requests_requested_at ON reschedule_requests(requested_at);
      `
    })
    
    if (indexError) {
      console.error('❌ Failed to create indexes:', indexError.message)
      return false
    }
    
    console.log('✅ Indexes created successfully')
    
    // Enable RLS and create policies
    console.log('📋 Setting up RLS policies...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS
        ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        -- Customers can view their own reschedule requests
        CREATE POLICY "Users can view their own reschedule requests"
            ON reschedule_requests FOR SELECT
            USING (customer_id = auth.uid());

        -- Customers can create reschedule requests for their own bookings
        CREATE POLICY "Users can create reschedule requests for their bookings"
            ON reschedule_requests FOR INSERT
            WITH CHECK (
                customer_id = auth.uid() 
                AND EXISTS (
                    SELECT 1 FROM bookings 
                    WHERE id = booking_id AND user_id = auth.uid()
                )
            );

        -- Admins can view all reschedule requests
        CREATE POLICY "Admins can view all reschedule requests"
            ON reschedule_requests FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );

        -- Admins can update reschedule requests (approve/reject)
        CREATE POLICY "Admins can update reschedule requests"
            ON reschedule_requests FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
      `
    })
    
    if (rlsError) {
      console.error('❌ Failed to create RLS policies:', rlsError.message)
      return false
    }
    
    console.log('✅ RLS policies created successfully')
    
    return true
    
  } catch (error) {
    console.error('❌ Error creating reschedule table:', error.message)
    return false
  }
}

async function testTableCreation() {
  try {
    console.log('🔍 Testing table creation...')
    
    const { data, error } = await supabase
      .from('reschedule_requests')
      .select('count(*)')
      .limit(1)
    
    if (error) {
      console.error('❌ Table test failed:', error.message)
      return false
    }
    
    console.log('✅ Table is accessible')
    console.log(`📊 Current records: ${data?.[0]?.count || 0}`)
    
    return true
    
  } catch (error) {
    console.error('❌ Error testing table:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting reschedule table creation...\n')
  
  // First, check if table already exists
  const tableExists = await testTableCreation()
  
  if (tableExists) {
    console.log('✅ reschedule_requests table already exists')
    return
  }
  
  // Create the table
  const created = await createRescheduleTable()
  
  if (!created) {
    console.log('\n❌ Failed to create reschedule table')
    return
  }
  
  // Test the creation
  const testPassed = await testTableCreation()
  
  if (testPassed) {
    console.log('\n🎉 Reschedule table created and tested successfully!')
    console.log('💡 Admin dashboard will now be able to show reschedule requests')
  } else {
    console.log('\n⚠️  Table created but test failed')
  }
}

// Main execution
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Reschedule table setup completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error)
      process.exit(1)
    })
}