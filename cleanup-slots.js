#!/usr/bin/env node

/**
 * Emergency Slot Cleanup Script
 * Removes excess slots that are overwhelming the UI
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function cleanupSlots() {
  console.log('🧹 Emergency Slot Cleanup');
  console.log('=========================');
  
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Clean up today's slots
    console.log(`\n🗑️  Cleaning up slots for ${today}...`);
    
    const response = await fetch(`${BASE_URL}/api/admin/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cleanup_slots',
        date: today
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Cleaned up ${result.data?.deleted_count || 0} slots`);
      console.log('\n🎯 UI Performance Should Be Restored');
      console.log('   - Admin dashboard will load faster');
      console.log('   - Booking form will be responsive');
      console.log('   - Week overview will display properly');
    } else {
      console.error(`❌ Cleanup failed: ${result.error}`);
    }
    
    // Also clean up tomorrow's slots
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`\n🗑️  Cleaning up slots for ${tomorrowStr}...`);
    
    const response2 = await fetch(`${BASE_URL}/api/admin/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cleanup_slots',
        date: tomorrowStr
      })
    });
    
    const result2 = await response2.json();
    
    if (response2.ok) {
      console.log(`✅ Cleaned up ${result2.data?.deleted_count || 0} slots`);
    }
    
    console.log('\n🚀 Cleanup Complete!');
    console.log('   Try refreshing the admin dashboard now');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

// Run the cleanup
cleanupSlots();