#!/usr/bin/env node

/**
 * Clean up all test users while preserving admin accounts
 * This script removes users from both auth.users and public.users tables
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CleanupStats {
  authUsersDeleted: number;
  publicUsersDeleted: number;
  bookingsDeleted: number;
  vehiclesDeleted: number;
  rewardsDeleted: number;
  rewardTransactionsDeleted: number;
  adminsPreserved: string[];
  errors: string[];
}

async function cleanupTestUsers(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    authUsersDeleted: 0,
    publicUsersDeleted: 0,
    bookingsDeleted: 0,
    vehiclesDeleted: 0,
    rewardsDeleted: 0,
    rewardTransactionsDeleted: 0,
    adminsPreserved: [],
    errors: []
  };

  try {
    console.log('🧹 Starting cleanup of test users...');
    console.log('⚠️  Admin accounts will be preserved\n');

    // Step 1: Get all users from public.users table
    const { data: publicUsers, error: publicUsersError } = await supabase
      .from('users')
      .select('id, email, role, full_name');

    if (publicUsersError) {
      stats.errors.push(`Failed to fetch public users: ${publicUsersError.message}`);
      return stats;
    }

    console.log(`📊 Found ${publicUsers?.length || 0} users in public.users table`);

    // Step 2: Identify admin users to preserve
    const adminUsers = publicUsers?.filter(user => user.role === 'admin') || [];
    const nonAdminUsers = publicUsers?.filter(user => user.role !== 'admin') || [];

    console.log(`👑 Admin users to preserve: ${adminUsers.length}`);
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.full_name})`);
      stats.adminsPreserved.push(admin.email);
    });

    console.log(`🗑️  Non-admin users to delete: ${nonAdminUsers.length}`);

    if (nonAdminUsers.length === 0) {
      console.log('✅ No non-admin users found to delete');
      return stats;
    }

    // Step 3: Delete related data for non-admin users
    const nonAdminUserIds = nonAdminUsers.map(user => user.id);

    // Delete reward transactions
    console.log('\n🔄 Deleting reward transactions...');
    const { error: rewardTxError, count: rewardTxCount } = await supabase
      .from('reward_transactions')
      .delete()
      .in('user_id', nonAdminUserIds);

    if (rewardTxError) {
      stats.errors.push(`Failed to delete reward transactions: ${rewardTxError.message}`);
    } else {
      stats.rewardTransactionsDeleted = rewardTxCount || 0;
      console.log(`✅ Deleted ${stats.rewardTransactionsDeleted} reward transactions`);
    }

    // Delete rewards
    console.log('\n🔄 Deleting rewards...');
    const { error: rewardsError, count: rewardsCount } = await supabase
      .from('rewards')
      .delete()
      .in('user_id', nonAdminUserIds);

    if (rewardsError) {
      stats.errors.push(`Failed to delete rewards: ${rewardsError.message}`);
    } else {
      stats.rewardsDeleted = rewardsCount || 0;
      console.log(`✅ Deleted ${stats.rewardsDeleted} rewards records`);
    }

    // Delete bookings
    console.log('\n🔄 Deleting bookings...');
    const { error: bookingsError, count: bookingsCount } = await supabase
      .from('bookings')
      .delete()
      .in('user_id', nonAdminUserIds);

    if (bookingsError) {
      stats.errors.push(`Failed to delete bookings: ${bookingsError.message}`);
    } else {
      stats.bookingsDeleted = bookingsCount || 0;
      console.log(`✅ Deleted ${stats.bookingsDeleted} bookings`);
    }

    // Delete vehicles
    console.log('\n🔄 Deleting vehicles...');
    const { error: vehiclesError, count: vehiclesCount } = await supabase
      .from('vehicles')
      .delete()
      .in('user_id', nonAdminUserIds);

    if (vehiclesError) {
      stats.errors.push(`Failed to delete vehicles: ${vehiclesError.message}`);
    } else {
      stats.vehiclesDeleted = vehiclesCount || 0;
      console.log(`✅ Deleted ${stats.vehiclesDeleted} vehicles`);
    }

    // Step 4: Delete from public.users table
    console.log('\n🔄 Deleting from public.users table...');
    const { error: publicDeleteError, count: publicDeleteCount } = await supabase
      .from('users')
      .delete()
      .in('id', nonAdminUserIds);

    if (publicDeleteError) {
      stats.errors.push(`Failed to delete public users: ${publicDeleteError.message}`);
    } else {
      stats.publicUsersDeleted = publicDeleteCount || 0;
      console.log(`✅ Deleted ${stats.publicUsersDeleted} users from public.users`);
    }

    // Step 5: Delete from auth.users table
    console.log('\n🔄 Deleting from auth.users table...');
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
    
    if (authListError) {
      stats.errors.push(`Failed to list auth users: ${authListError.message}`);
    } else {
      const authUsersToDelete = authUsers.users.filter(authUser => {
        // Only delete if the user is not an admin (check against our admin list)
        return !adminUsers.some(admin => admin.email === authUser.email);
      });

      console.log(`🔍 Found ${authUsersToDelete.length} auth users to delete`);

      for (const authUser of authUsersToDelete) {
        try {
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.id);
          if (deleteAuthError) {
            stats.errors.push(`Failed to delete auth user ${authUser.email}: ${deleteAuthError.message}`);
          } else {
            stats.authUsersDeleted++;
            console.log(`✅ Deleted auth user: ${authUser.email}`);
          }
        } catch (error) {
          stats.errors.push(`Error deleting auth user ${authUser.email}: ${error}`);
        }
      }
    }

    return stats;

  } catch (error) {
    stats.errors.push(`Unexpected error: ${error}`);
    return stats;
  }
}

async function resetTimeSlots() {
  console.log('\n🔄 Resetting time slots...');
  
  try {
    // Mark all time slots as available
    const { error: resetError, count } = await supabase
      .from('time_slots')
      .update({ is_booked: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Add a WHERE clause

    if (resetError) {
      console.error(`❌ Failed to reset time slots: ${resetError.message}`);
    } else {
      console.log(`✅ Reset ${count || 0} time slots to available`);
    }
  } catch (error) {
    console.error(`❌ Error resetting time slots: ${error}`);
  }
}

async function main() {
  console.log('🚀 Love4Detailing Database Cleanup');
  console.log('=====================================\n');

  // Confirm before proceeding
  console.log('⚠️  WARNING: This will delete ALL non-admin users and their data!');
  console.log('📋 What will be deleted:');
  console.log('   - All users with role !== "admin"');
  console.log('   - All their bookings');
  console.log('   - All their vehicles');
  console.log('   - All their rewards and transactions');
  console.log('   - Their auth accounts');
  console.log('\n✅ What will be preserved:');
  console.log('   - Admin accounts (role === "admin")');
  console.log('   - Vehicle sizes table');
  console.log('   - Time slots table (but will be reset to available)');
  console.log('\n🔄 Starting cleanup in 3 seconds...\n');

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));

  const stats = await cleanupTestUsers();
  
  // Reset time slots
  await resetTimeSlots();

  // Display results
  console.log('\n📊 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`👑 Admin accounts preserved: ${stats.adminsPreserved.length}`);
  stats.adminsPreserved.forEach(email => console.log(`   - ${email}`));
  console.log(`🗑️  Auth users deleted: ${stats.authUsersDeleted}`);
  console.log(`🗑️  Public users deleted: ${stats.publicUsersDeleted}`);
  console.log(`🗑️  Bookings deleted: ${stats.bookingsDeleted}`);
  console.log(`🗑️  Vehicles deleted: ${stats.vehiclesDeleted}`);
  console.log(`🗑️  Rewards deleted: ${stats.rewardsDeleted}`);
  console.log(`🗑️  Reward transactions deleted: ${stats.rewardTransactionsDeleted}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(error => console.log(`   - ${error}`));
  } else {
    console.log('\n✅ Cleanup completed successfully!');
  }

  console.log('\n🎯 Database is now clean and ready for production use!');
}

// Run the cleanup
main().catch(console.error);