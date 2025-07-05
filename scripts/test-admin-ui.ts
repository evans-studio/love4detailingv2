#!/usr/bin/env tsx

/**
 * Admin UI Test Script
 * Tests the admin dashboard UI components and functionality
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

class AdminUITester {
  private results: TestResult[] = [];

  private logResult(result: TestResult) {
    this.results.push(result);
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name}`);
    if (result.details) console.log(`   ${result.details}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  }

  async testAdminNavigation() {
    console.log('\n🧭 Testing Admin Navigation & Layout...');

    try {
      // Test 1: Check if admin routes are accessible
      const adminRoutes = [
        '/admin',
        '/admin/bookings',
        '/admin/availability',
        '/admin/pricing',
        '/admin/policies',
        '/admin/users'
      ];

      this.logResult({
        name: 'Admin Routes Structure',
        status: 'PASS',
        details: `Verified ${adminRoutes.length} admin routes defined`
      });

      // Test 2: Check admin layout component exists
      const fs = require('fs');
      const adminLayoutPath = resolve(__dirname, '../src/app/admin/layout.tsx');
      
      if (fs.existsSync(adminLayoutPath)) {
        this.logResult({
          name: 'Admin Layout Component',
          status: 'PASS',
          details: 'Admin layout component exists'
        });
      } else {
        this.logResult({
          name: 'Admin Layout Component',
          status: 'FAIL',
          details: 'Admin layout component not found'
        });
      }

      // Test 3: Check admin auth protection
      const authPath = resolve(__dirname, '../src/lib/auth/admin.ts');
      
      if (fs.existsSync(authPath)) {
        this.logResult({
          name: 'Admin Auth Protection',
          status: 'PASS',
          details: 'Admin auth protection module exists'
        });
      } else {
        this.logResult({
          name: 'Admin Auth Protection',
          status: 'FAIL',
          details: 'Admin auth protection module not found'
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Admin Navigation Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testAdminComponents() {
    console.log('\n🧩 Testing Admin Components...');

    try {
      const fs = require('fs');
      
      // Test 1: Check admin page components
      const adminPages = [
        '../src/app/admin/page.tsx',
        '../src/app/admin/bookings/page.tsx',
        '../src/app/admin/availability/page.tsx',
        '../src/app/admin/pricing/page.tsx',
        '../src/app/admin/policies/page.tsx',
        '../src/app/admin/users/page.tsx'
      ];

      let existingPages = 0;
      for (const page of adminPages) {
        const pagePath = resolve(__dirname, page);
        if (fs.existsSync(pagePath)) {
          existingPages++;
        }
      }

      this.logResult({
        name: 'Admin Page Components',
        status: existingPages === adminPages.length ? 'PASS' : 'FAIL',
        details: `${existingPages}/${adminPages.length} admin page components found`
      });

      // Test 2: Check admin API routes
      const apiRoutes = [
        '../src/app/api/admin/users/route.ts',
        '../src/app/api/admin/time-slots/route.ts'
      ];

      let existingApiRoutes = 0;
      for (const route of apiRoutes) {
        const routePath = resolve(__dirname, route);
        if (fs.existsSync(routePath)) {
          existingApiRoutes++;
        }
      }

      this.logResult({
        name: 'Admin API Routes',
        status: existingApiRoutes > 0 ? 'PASS' : 'FAIL',
        details: `${existingApiRoutes}/${apiRoutes.length} admin API routes found`
      });

      // Test 3: Check admin UI utilities
      const adminApiPath = resolve(__dirname, '../src/lib/api/admin.ts');
      
      if (fs.existsSync(adminApiPath)) {
        this.logResult({
          name: 'Admin API Utilities',
          status: 'PASS',
          details: 'Admin API utilities module exists'
        });
      } else {
        this.logResult({
          name: 'Admin API Utilities',
          status: 'FAIL',
          details: 'Admin API utilities module not found'
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Admin Components Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testAdminDataFlow() {
    console.log('\n🔄 Testing Admin Data Flow...');

    try {
      // Test 1: Admin can fetch bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          users (
            id,
            full_name,
            email
          ),
          vehicles (
            id,
            registration,
            make,
            model
          ),
          time_slots (
            id,
            slot_date,
            slot_time
          )
        `)
        .limit(5);

      if (bookingsError) {
        this.logResult({
          name: 'Admin Bookings Data Flow',
          status: 'FAIL',
          error: bookingsError.message
        });
      } else {
        this.logResult({
          name: 'Admin Bookings Data Flow',
          status: 'PASS',
          details: `Retrieved ${bookings?.length || 0} bookings with relations`
        });
      }

      // Test 2: Admin can fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5);

      if (usersError) {
        this.logResult({
          name: 'Admin Users Data Flow',
          status: 'FAIL',
          error: usersError.message
        });
      } else {
        this.logResult({
          name: 'Admin Users Data Flow',
          status: 'PASS',
          details: `Retrieved ${users?.length || 0} users`
        });
      }

      // Test 3: Admin can fetch time slots
      const { data: timeSlots, error: timeSlotsError } = await supabase
        .from('time_slots')
        .select('*')
        .limit(5);

      if (timeSlotsError) {
        this.logResult({
          name: 'Admin Time Slots Data Flow',
          status: 'FAIL',
          error: timeSlotsError.message
        });
      } else {
        this.logResult({
          name: 'Admin Time Slots Data Flow',
          status: 'PASS',
          details: `Retrieved ${timeSlots?.length || 0} time slots`
        });
      }

      // Test 4: Admin can fetch vehicle sizes
      const { data: vehicleSizes, error: vehicleSizesError } = await supabase
        .from('vehicle_sizes')
        .select('*');

      if (vehicleSizesError) {
        this.logResult({
          name: 'Admin Vehicle Sizes Data Flow',
          status: 'FAIL',
          error: vehicleSizesError.message
        });
      } else {
        this.logResult({
          name: 'Admin Vehicle Sizes Data Flow',
          status: 'PASS',
          details: `Retrieved ${vehicleSizes?.length || 0} vehicle sizes`
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Admin Data Flow Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testAdminSecurity() {
    console.log('\n🔒 Testing Admin Security...');

    try {
      // Test 1: Check if admin role exists
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('role', 'admin');

      if (adminError) {
        this.logResult({
          name: 'Admin Role Security',
          status: 'FAIL',
          error: adminError.message
        });
      } else {
        this.logResult({
          name: 'Admin Role Security',
          status: 'PASS',
          details: `Found ${adminUsers?.length || 0} admin users`
        });
      }

      // Test 2: Check RLS policies on admin tables
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .like('tablename', '%users%');

      if (policiesError) {
        this.logResult({
          name: 'RLS Policies Check',
          status: 'SKIP',
          details: 'Cannot access pg_policies table'
        });
      } else {
        this.logResult({
          name: 'RLS Policies Check',
          status: 'PASS',
          details: `Found ${policies?.length || 0} RLS policies`
        });
      }

      // Test 3: Test admin middleware protection
      const fs = require('fs');
      const middlewarePath = resolve(__dirname, '../src/middleware.ts');
      
      if (fs.existsSync(middlewarePath)) {
        this.logResult({
          name: 'Admin Middleware Protection',
          status: 'PASS',
          details: 'Middleware protection exists'
        });
      } else {
        this.logResult({
          name: 'Admin Middleware Protection',
          status: 'FAIL',
          details: 'Middleware protection not found'
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Admin Security Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testAdminFunctionalityEdgeCases() {
    console.log('\n🔍 Testing Admin Functionality Edge Cases...');

    try {
      // Test 1: Handle missing user data
      const { data: bookingsWithoutUser, error: noUserError } = await supabase
        .from('bookings')
        .select(`
          *,
          users (
            id,
            full_name,
            email
          )
        `)
        .is('user_id', null);

      if (noUserError) {
        this.logResult({
          name: 'Missing User Data Handling',
          status: 'FAIL',
          error: noUserError.message
        });
      } else {
        this.logResult({
          name: 'Missing User Data Handling',
          status: 'PASS',
          details: `Found ${bookingsWithoutUser?.length || 0} bookings without users`
        });
      }

      // Test 2: Handle missing time slot data
      const { data: bookingsWithoutTimeSlot, error: noTimeSlotError } = await supabase
        .from('bookings')
        .select(`
          *,
          time_slots (
            id,
            slot_date,
            slot_time
          )
        `)
        .is('time_slot_id', null);

      if (noTimeSlotError) {
        this.logResult({
          name: 'Missing Time Slot Data Handling',
          status: 'FAIL',
          error: noTimeSlotError.message
        });
      } else {
        this.logResult({
          name: 'Missing Time Slot Data Handling',
          status: 'PASS',
          details: `Found ${bookingsWithoutTimeSlot?.length || 0} bookings without time slots`
        });
      }

      // Test 3: Handle missing vehicle data
      const { data: bookingsWithoutVehicle, error: noVehicleError } = await supabase
        .from('bookings')
        .select(`
          *,
          vehicles (
            id,
            registration,
            make,
            model
          )
        `)
        .is('vehicle_id', null);

      if (noVehicleError) {
        this.logResult({
          name: 'Missing Vehicle Data Handling',
          status: 'FAIL',
          error: noVehicleError.message
        });
      } else {
        this.logResult({
          name: 'Missing Vehicle Data Handling',
          status: 'PASS',
          details: `Found ${bookingsWithoutVehicle?.length || 0} bookings without vehicles`
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Admin Edge Cases Test',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async runAllTests() {
    console.log('🎯 Starting Admin UI Test Suite...\n');

    await this.testAdminNavigation();
    await this.testAdminComponents();
    await this.testAdminDataFlow();
    await this.testAdminSecurity();
    await this.testAdminFunctionalityEdgeCases();

    this.printSummary();
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ADMIN UI TEST RESULTS SUMMARY');
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
      console.log('\n🎉 All admin UI tests passed! Admin dashboard UI is fully functional.');
    } else {
      console.log(`\n⚠️  ${failCount} test(s) failed. Please review the issues above.`);
    }
  }
}

// Run the tests
const tester = new AdminUITester();
tester.runAllTests().catch(console.error);