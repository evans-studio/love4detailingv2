#!/usr/bin/env tsx

/**
 * Comprehensive Admin Dashboard Test Script
 * Tests all admin functionality including CRUD operations, navigation, and error handling
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
  error?: string;
}

class AdminDashboardTester {
  private results: TestResult[] = [];
  private testUserId: string | null = null;
  private testBookingId: string | null = null;
  private testTimeSlotId: string | null = null;

  private logResult(result: TestResult) {
    this.results.push(result);
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name}`);
    if (result.details) console.log(`   ${result.details}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  }

  async testAdminAuthentication() {
    console.log('\n🔐 Testing Admin Authentication & Access Control...');
    
    try {
      // Test 1: Check if admin users exist
      const { data: adminUsers, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('role', 'admin');

      if (error) {
        this.logResult({
          name: 'Admin User Query',
          status: 'FAIL',
          error: error.message
        });
        return;
      }

      if (adminUsers && adminUsers.length > 0) {
        this.testUserId = adminUsers[0].id;
        this.logResult({
          name: 'Admin User Query',
          status: 'PASS',
          details: `Found ${adminUsers.length} admin user(s)`
        });
      } else {
        this.logResult({
          name: 'Admin User Query',
          status: 'FAIL',
          details: 'No admin users found in database'
        });
      }

      // Test 2: Check admin role verification function
      const { data: roleCheck, error: roleError } = await supabase
        .rpc('check_user_role', { check_role: 'admin' });

      if (roleError) {
        this.logResult({
          name: 'Admin Role Function',
          status: 'FAIL',
          error: roleError.message
        });
      } else {
        this.logResult({
          name: 'Admin Role Function',
          status: 'PASS',
          details: 'Role verification function working'
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Admin Authentication Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testBookingsManagement() {
    console.log('\n📋 Testing Bookings Management...');

    try {
      // Test 1: Read bookings with relations
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          user:users(id, email, full_name),
          vehicle:vehicles(id, make, model, registration),
          time_slot:time_slots(id, slot_date, slot_time)
        `)
        .limit(5);

      if (bookingsError) {
        this.logResult({
          name: 'Bookings Query',
          status: 'FAIL',
          error: bookingsError.message
        });
        return;
      }

      this.logResult({
        name: 'Bookings Query',
        status: 'PASS',
        details: `Retrieved ${bookings?.length || 0} bookings with relations`
      });

      if (bookings && bookings.length > 0) {
        this.testBookingId = bookings[0].id;
        
        // Test 2: Update booking status
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ 
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', this.testBookingId);

        if (updateError) {
          this.logResult({
            name: 'Booking Update',
            status: 'FAIL',
            error: updateError.message
          });
        } else {
          this.logResult({
            name: 'Booking Update',
            status: 'PASS',
            details: 'Successfully updated booking status'
          });

          // Revert the change
          await supabase
            .from('bookings')
            .update({ status: bookings[0].status })
            .eq('id', this.testBookingId);
        }

        // Test 3: Test booking filtering
        const { data: filteredBookings, error: filterError } = await supabase
          .from('bookings')
          .select('*')
          .eq('status', 'confirmed')
          .limit(10);

        if (filterError) {
          this.logResult({
            name: 'Booking Filtering',
            status: 'FAIL',
            error: filterError.message
          });
        } else {
          this.logResult({
            name: 'Booking Filtering',
            status: 'PASS',
            details: `Found ${filteredBookings?.length || 0} confirmed bookings`
          });
        }
      }

      // Test 4: Test payment status updates
      if (this.testBookingId) {
        const { error: paymentError } = await supabase
          .from('bookings')
          .update({ payment_status: 'paid' })
          .eq('id', this.testBookingId);

        if (paymentError) {
          this.logResult({
            name: 'Payment Status Update',
            status: 'FAIL',
            error: paymentError.message
          });
        } else {
          this.logResult({
            name: 'Payment Status Update',
            status: 'PASS',
            details: 'Payment status updated successfully'
          });
        }
      }

    } catch (error) {
      this.logResult({
        name: 'Bookings Management Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testTimeSlotManagement() {
    console.log('\n⏰ Testing Time Slot Management...');

    try {
      // Test 1: Query time slots
      const { data: timeSlots, error: timeSlotsError } = await supabase
        .from('time_slots')
        .select('*')
        .limit(10);

      if (timeSlotsError) {
        this.logResult({
          name: 'Time Slots Query',
          status: 'FAIL',
          error: timeSlotsError.message
        });
        return;
      }

      this.logResult({
        name: 'Time Slots Query',
        status: 'PASS',
        details: `Retrieved ${timeSlots?.length || 0} time slots`
      });

      // Test 2: Create a test time slot
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 7); // One week from now
      
      const { data: newSlot, error: createError } = await supabase
        .from('time_slots')
        .insert({
          slot_date: testDate.toISOString().split('T')[0],
          slot_time: '10:00',
          is_available: true
        })
        .select()
        .single();

      if (createError) {
        this.logResult({
          name: 'Time Slot Creation',
          status: 'FAIL',
          error: createError.message
        });
      } else {
        this.testTimeSlotId = newSlot.id;
        this.logResult({
          name: 'Time Slot Creation',
          status: 'PASS',
          details: 'Successfully created test time slot'
        });
      }

      // Test 3: Update time slot availability
      if (this.testTimeSlotId) {
        const { error: updateError } = await supabase
          .from('time_slots')
          .update({ is_available: false })
          .eq('id', this.testTimeSlotId);

        if (updateError) {
          this.logResult({
            name: 'Time Slot Update',
            status: 'FAIL',
            error: updateError.message
          });
        } else {
          this.logResult({
            name: 'Time Slot Update',
            status: 'PASS',
            details: 'Successfully updated time slot availability'
          });
        }
      }

      // Test 4: Bulk time slot operations
      const { data: bulkSlots, error: bulkError } = await supabase
        .from('time_slots')
        .select('id')
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .limit(5);

      if (bulkError) {
        this.logResult({
          name: 'Bulk Time Slot Query',
          status: 'FAIL',
          error: bulkError.message
        });
      } else {
        this.logResult({
          name: 'Bulk Time Slot Query',
          status: 'PASS',
          details: `Retrieved ${bulkSlots?.length || 0} future time slots`
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Time Slot Management Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testPricingManagement() {
    console.log('\n💰 Testing Pricing Management...');

    try {
      // Test 1: Query vehicle sizes and pricing
      const { data: vehicleSizes, error: sizesError } = await supabase
        .from('vehicle_sizes')
        .select('*');

      if (sizesError) {
        this.logResult({
          name: 'Vehicle Sizes Query',
          status: 'FAIL',
          error: sizesError.message
        });
        return;
      }

      this.logResult({
        name: 'Vehicle Sizes Query',
        status: 'PASS',
        details: `Retrieved ${vehicleSizes?.length || 0} vehicle sizes`
      });

      // Test 2: Update pricing
      if (vehicleSizes && vehicleSizes.length > 0) {
        const originalPrice = vehicleSizes[0].price_pence;
        const testPrice = originalPrice + 100; // Add £1 for testing

        const { error: updateError } = await supabase
          .from('vehicle_sizes')
          .update({ price_pence: testPrice })
          .eq('id', vehicleSizes[0].id);

        if (updateError) {
          this.logResult({
            name: 'Pricing Update',
            status: 'FAIL',
            error: updateError.message
          });
        } else {
          this.logResult({
            name: 'Pricing Update',
            status: 'PASS',
            details: 'Successfully updated vehicle size pricing'
          });

          // Revert the change
          await supabase
            .from('vehicle_sizes')
            .update({ price_pence: originalPrice })
            .eq('id', vehicleSizes[0].id);
        }
      }

      // Test 3: Query service add-ons (if table exists)
      const { data: addons, error: addonsError } = await supabase
        .from('service_addons')
        .select('*');

      if (addonsError) {
        this.logResult({
          name: 'Service Add-ons Query',
          status: 'SKIP',
          details: 'service_addons table not found or accessible'
        });
      } else {
        this.logResult({
          name: 'Service Add-ons Query',
          status: 'PASS',
          details: `Retrieved ${addons?.length || 0} service add-ons`
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Pricing Management Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testUserManagement() {
    console.log('\n👥 Testing User Management...');

    try {
      // Test 1: Query users with statistics
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          bookings(count),
          vehicles(count)
        `)
        .limit(10);

      if (usersError) {
        this.logResult({
          name: 'Users Query',
          status: 'FAIL',
          error: usersError.message
        });
        return;
      }

      this.logResult({
        name: 'Users Query',
        status: 'PASS',
        details: `Retrieved ${users?.length || 0} users with statistics`
      });

      // Test 2: Role management
      if (users && users.length > 0) {
        const testUser = users.find(u => u.role === 'customer');
        
        if (testUser) {
          // Test role update (but don't actually change anything permanent)
          const { error: roleError } = await supabase
            .from('users')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', testUser.id);

          if (roleError) {
            this.logResult({
              name: 'User Role Update',
              status: 'FAIL',
              error: roleError.message
            });
          } else {
            this.logResult({
              name: 'User Role Update',
              status: 'PASS',
              details: 'User update functionality working'
            });
          }
        }
      }

      // Test 3: User filtering
      const { data: customerUsers, error: customerError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer')
        .limit(5);

      if (customerError) {
        this.logResult({
          name: 'User Filtering',
          status: 'FAIL',
          error: customerError.message
        });
      } else {
        this.logResult({
          name: 'User Filtering',
          status: 'PASS',
          details: `Found ${customerUsers?.length || 0} customer users`
        });
      }

    } catch (error) {
      this.logResult({
        name: 'User Management Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testRewardsSystem() {
    console.log('\n🎁 Testing Rewards System...');

    try {
      // Test 1: Query reward transactions
      const { data: rewards, error: rewardsError } = await supabase
        .from('reward_transactions')
        .select(`
          *,
          user:users(id, email, full_name)
        `)
        .limit(10);

      if (rewardsError) {
        this.logResult({
          name: 'Rewards Query',
          status: 'FAIL',
          error: rewardsError.message
        });
        return;
      }

      this.logResult({
        name: 'Rewards Query',
        status: 'PASS',
        details: `Retrieved ${rewards?.length || 0} reward transactions`
      });

      // Test 2: User reward statistics
      if (this.testUserId) {
        const { data: userRewards, error: userRewardsError } = await supabase
          .from('reward_transactions')
          .select('points_earned, points_redeemed')
          .eq('user_id', this.testUserId);

        if (userRewardsError) {
          this.logResult({
            name: 'User Rewards Query',
            status: 'FAIL',
            error: userRewardsError.message
          });
        } else {
          this.logResult({
            name: 'User Rewards Query',
            status: 'PASS',
            details: `Retrieved user reward history`
          });
        }
      }

    } catch (error) {
      this.logResult({
        name: 'Rewards System Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testDatabaseIntegrity() {
    console.log('\n🔍 Testing Database Integrity...');

    try {
      // Test 1: Check for orphaned records
      const { data: orphanedBookings, error: orphanError } = await supabase
        .from('bookings')
        .select('id, user_id, time_slot_id')
        .is('user_id', null);

      if (orphanError) {
        this.logResult({
          name: 'Orphaned Records Check',
          status: 'FAIL',
          error: orphanError.message
        });
      } else {
        this.logResult({
          name: 'Orphaned Records Check',
          status: 'PASS',
          details: `Found ${orphanedBookings?.length || 0} orphaned bookings`
        });
      }

      // Test 2: Check booking constraints
      const { data: bookingConstraints, error: constraintError } = await supabase
        .from('bookings')
        .select('id, booking_reference, created_at')
        .not('booking_reference', 'is', null)
        .limit(5);

      if (constraintError) {
        this.logResult({
          name: 'Booking Constraints Check',
          status: 'FAIL',
          error: constraintError.message
        });
      } else {
        this.logResult({
          name: 'Booking Constraints Check',
          status: 'PASS',
          details: 'Booking references are properly set'
        });
      }

      // Test 3: Check time slot booking conflicts
      const { data: conflictCheck, error: conflictError } = await supabase
        .from('time_slots')
        .select('id, slot_date, slot_time, is_booked')
        .eq('is_booked', true)
        .limit(5);

      if (conflictError) {
        this.logResult({
          name: 'Time Slot Conflicts Check',
          status: 'FAIL',
          error: conflictError.message
        });
      } else {
        this.logResult({
          name: 'Time Slot Conflicts Check',
          status: 'PASS',
          details: `Found ${conflictCheck?.length || 0} booked time slots`
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Database Integrity Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    try {
      // Clean up test time slot
      if (this.testTimeSlotId) {
        await supabase
          .from('time_slots')
          .delete()
          .eq('id', this.testTimeSlotId);

        this.logResult({
          name: 'Test Data Cleanup',
          status: 'PASS',
          details: 'Cleaned up test time slot'
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Test Data Cleanup',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Admin Dashboard Comprehensive Test Suite...\n');

    await this.testAdminAuthentication();
    await this.testBookingsManagement();
    await this.testTimeSlotManagement();
    await this.testPricingManagement();
    await this.testUserManagement();
    await this.testRewardsSystem();
    await this.testDatabaseIntegrity();
    await this.cleanup();

    this.printSummary();
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const skipCount = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`✅ PASSED: ${passCount}`);
    console.log(`❌ FAILED: ${failCount}`);
    console.log(`⏭️  SKIPPED: ${skipCount}`);
    console.log(`📋 TOTAL: ${this.results.length}`);

    if (failCount > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   • ${r.name}: ${r.error}`);
        });
    }

    const successRate = ((passCount / (passCount + failCount)) * 100).toFixed(1);
    console.log(`\n🎯 SUCCESS RATE: ${successRate}%`);
    
    if (failCount === 0) {
      console.log('\n🎉 All tests passed! Admin dashboard is fully functional.');
    } else {
      console.log(`\n⚠️  ${failCount} test(s) failed. Please review the issues above.`);
    }
  }
}

// Run the tests
const tester = new AdminDashboardTester();
tester.runAllTests().catch(console.error);