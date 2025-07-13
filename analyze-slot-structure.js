#!/usr/bin/env node

/**
 * Analyze Slot Table Structure and Propose Simplification
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeSlotStructure() {
  console.log('🔍 ANALYZING SLOT AVAILABILITY SYSTEM')
  console.log('=' .repeat(45))
  
  try {
    // Step 1: Check current table structure
    console.log('\n📊 1. Current available_slots Table Structure:')
    const { data: sampleSlot } = await supabase
      .from('available_slots')
      .select('*')
      .limit(1)
    
    if (sampleSlot && sampleSlot.length > 0) {
      const columns = Object.keys(sampleSlot[0])
      console.log('📋 Current Columns:')
      columns.forEach(col => {
        const value = sampleSlot[0][col]
        const type = typeof value
        console.log(`   - ${col}: ${type} (example: ${value})`)
      })
    }
    
    // Step 2: Analyze current complexity
    console.log('\n🔍 2. Current System Complexity Analysis:')
    const { data: allSlots } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, current_bookings, max_bookings, is_blocked')
      .order('slot_date')
      .limit(20)
    
    if (allSlots) {
      console.log('\n📊 Sample of Current Logic:')
      allSlots.slice(0, 10).forEach(slot => {
        // Current complex logic
        const isAvailable = !slot.is_blocked && slot.current_bookings < slot.max_bookings
        const status = slot.is_blocked ? 'blocked' : 
                      slot.current_bookings >= slot.max_bookings ? 'booked' : 'available'
        
        console.log(`   ${slot.slot_date} ${slot.start_time}: ${status} (current=${slot.current_bookings}, max=${slot.max_bookings}, blocked=${slot.is_blocked})`)
      })
    }
    
    // Step 3: Propose simplified system
    console.log('\n💡 3. PROPOSED SIMPLIFIED SYSTEM:')
    console.log('📋 Replace complex fields with simple slot_status enum:')
    console.log('   ✅ slot_status: "available" | "booked" | "blocked"')
    console.log('')
    console.log('🗑️  FIELDS TO REMOVE:')
    console.log('   ❌ current_bookings (redundant)')
    console.log('   ❌ max_bookings (redundant)')  
    console.log('   ❌ is_blocked (redundant)')
    console.log('')
    console.log('✅ FIELDS TO KEEP:')
    console.log('   ✅ id (primary key)')
    console.log('   ✅ slot_date (when)')
    console.log('   ✅ start_time (when)')
    console.log('   ✅ end_time (duration)')
    console.log('   ✅ slot_status (availability)')
    console.log('   ✅ created_at (audit)')
    
    // Step 4: Show the benefits
    console.log('\n🎯 4. BENEFITS OF SIMPLIFIED SYSTEM:')
    console.log('✅ Single source of truth for slot status')
    console.log('✅ No complex calculations needed')
    console.log('✅ Easier to understand and maintain')
    console.log('✅ No counter synchronization issues')
    console.log('✅ Clear, readable status values')
    console.log('✅ Simpler API responses')
    console.log('✅ Fewer database columns')
    
    // Step 5: Migration plan
    console.log('\n📋 5. MIGRATION PLAN:')
    console.log('1️⃣ Add slot_status column with enum type')
    console.log('2️⃣ Populate slot_status based on current logic:')
    console.log('   - blocked if is_blocked = true')
    console.log('   - booked if current_bookings >= max_bookings')
    console.log('   - available otherwise')
    console.log('3️⃣ Update all API endpoints to use slot_status')
    console.log('4️⃣ Update frontend components to use slot_status')
    console.log('5️⃣ Remove old columns: current_bookings, max_bookings, is_blocked')
    
    // Step 6: Generate migration SQL
    console.log('\n📝 6. PROPOSED MIGRATION SQL:')
    console.log('```sql')
    console.log('-- Step 1: Add new slot_status column')
    console.log("ALTER TABLE available_slots ADD COLUMN slot_status TEXT CHECK (slot_status IN ('available', 'booked', 'blocked'));")
    console.log('')
    console.log('-- Step 2: Populate slot_status based on current logic')
    console.log("UPDATE available_slots SET slot_status = ")
    console.log("  CASE ")
    console.log("    WHEN is_blocked = true THEN 'blocked'")
    console.log("    WHEN current_bookings >= max_bookings THEN 'booked'")
    console.log("    ELSE 'available'")
    console.log("  END;")
    console.log('')
    console.log('-- Step 3: Make slot_status required')
    console.log("ALTER TABLE available_slots ALTER COLUMN slot_status SET NOT NULL;")
    console.log('')
    console.log('-- Step 4: Remove old columns (after API migration)')
    console.log('-- ALTER TABLE available_slots DROP COLUMN current_bookings;')
    console.log('-- ALTER TABLE available_slots DROP COLUMN max_bookings;')
    console.log('-- ALTER TABLE available_slots DROP COLUMN is_blocked;')
    console.log('```')
    
    // Step 7: Show simplified API response
    console.log('\n📡 7. SIMPLIFIED API RESPONSE EXAMPLE:')
    console.log('```json')
    console.log('{')
    console.log('  "id": "123e4567-e89b-12d3-a456-426614174000",')
    console.log('  "slot_date": "2025-07-15",')
    console.log('  "start_time": "10:00:00",')
    console.log('  "end_time": "12:00:00",')
    console.log('  "slot_status": "available"')
    console.log('}')
    console.log('```')
    
    console.log('\n💬 8. RECOMMENDATION:')
    console.log('🎯 YES - Simplify to slot_status immediately!')
    console.log('📈 This will make the system much more maintainable')
    console.log('🚀 Reduced complexity = fewer bugs')
    console.log('👨‍💻 Easier for developers to understand')
    
  } catch (error) {
    console.error('\n❌ Error analyzing slot structure:', error.message)
  }
}

// Run analysis
if (require.main === module) {
  analyzeSlotStructure()
    .then(() => {
      console.log('\n✅ Analysis completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Analysis failed:', error)
      process.exit(1)
    })
}