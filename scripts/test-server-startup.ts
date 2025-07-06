#!/usr/bin/env tsx

/**
 * Development Server Test Script
 * Tests that the development server starts and admin routes are accessible
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
  error?: string;
}

class ServerTester {
  private results: TestResult[] = [];
  private serverProcess: any = null;
  private serverStarted = false;

  private logResult(result: TestResult) {
    this.results.push(result);
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name}`);
    if (result.details) console.log(`   ${result.details}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  }

  async startServer() {
    console.log('🚀 Starting development server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      this.serverProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        
        // Look for successful startup indicators
        if (text.includes('Ready in') || text.includes('Local:') || text.includes('localhost:3000')) {
          this.serverStarted = true;
          this.logResult({
            name: 'Development Server Startup',
            status: 'PASS',
            details: 'Server started successfully'
          });
          resolve(true);
        }
      });

      this.serverProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      this.serverProcess.on('error', (error: Error) => {
        this.logResult({
          name: 'Development Server Startup',
          status: 'FAIL',
          error: error.message
        });
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.serverStarted) {
          this.logResult({
            name: 'Development Server Startup',
            status: 'FAIL',
            error: 'Server startup timeout (30s)'
          });
          reject(new Error('Server startup timeout'));
        }
      }, 30000);
    });
  }

  async testServerResponses() {
    console.log('\n🌐 Testing server responses...');
    
    // Give server a moment to fully start
    await new Promise(resolve => setTimeout(resolve, 2000));

    const routes = [
      { path: '/', name: 'Home Page' },
      { path: '/book', name: 'Booking Page' },
      { path: '/auth/sign-in', name: 'Sign In Page' },
      { path: '/admin', name: 'Admin Dashboard' },
      { path: '/admin/bookings', name: 'Admin Bookings' },
      { path: '/admin/availability', name: 'Admin Availability' },
      { path: '/admin/pricing', name: 'Admin Pricing' },
      { path: '/admin/policies', name: 'Admin Policies' },
      { path: '/admin/users', name: 'Admin Users' },
    ];

    for (const route of routes) {
      try {
        const response = await fetch(`http://localhost:3000${route.path}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Admin-Test-Script/1.0'
          }
        });

        if (response.ok) {
          this.logResult({
            name: route.name,
            status: 'PASS',
            details: `HTTP ${response.status} - ${response.statusText}`
          });
        } else if (response.status === 401 || response.status === 403) {
          // Auth-protected routes are expected to redirect or show auth error
          this.logResult({
            name: route.name,
            status: 'PASS',
            details: `HTTP ${response.status} - Auth protection working`
          });
        } else {
          this.logResult({
            name: route.name,
            status: 'FAIL',
            error: `HTTP ${response.status} - ${response.statusText}`
          });
        }
      } catch (error) {
        this.logResult({
          name: route.name,
          status: 'FAIL',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔧 Testing API endpoints...');
    
    const apiEndpoints = [
      { path: '/api/vehicle-sizes', name: 'Vehicle Sizes API' },
      { path: '/api/time-slots', name: 'Time Slots API' },
      { path: '/api/bookings', name: 'Bookings API' },
      { path: '/api/admin/users', name: 'Admin Users API' },
      { path: '/api/admin/time-slots', name: 'Admin Time Slots API' },
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint.path}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Admin-Test-Script/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.logResult({
            name: endpoint.name,
            status: 'PASS',
            details: `HTTP ${response.status} - Data retrieved`
          });
        } else if (response.status === 401 || response.status === 403 || response.status === 405) {
          // Auth-protected or method not allowed is expected
          this.logResult({
            name: endpoint.name,
            status: 'PASS',
            details: `HTTP ${response.status} - Auth/method protection working`
          });
        } else {
          this.logResult({
            name: endpoint.name,
            status: 'FAIL',
            error: `HTTP ${response.status} - ${response.statusText}`
          });
        }
      } catch (error) {
        this.logResult({
          name: endpoint.name,
          status: 'FAIL',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async testBuildHealth() {
    console.log('\n🏗️ Testing build health...');
    
    const fs = require('fs');
    const path = require('path');

    try {
      // Check if .next directory exists
      const nextDir = path.join(process.cwd(), '.next');
      if (fs.existsSync(nextDir)) {
        this.logResult({
          name: 'Build Directory',
          status: 'PASS',
          details: '.next directory exists'
        });
      } else {
        this.logResult({
          name: 'Build Directory',
          status: 'FAIL',
          details: '.next directory missing'
        });
      }

      // Check package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        this.logResult({
          name: 'Package Configuration',
          status: 'PASS',
          details: `Next.js ${packageData.dependencies?.next || 'version not found'}`
        });
      } else {
        this.logResult({
          name: 'Package Configuration',
          status: 'FAIL',
          details: 'package.json not found'
        });
      }

      // Check environment variables
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ];

      let missingVars = [];
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          missingVars.push(envVar);
        }
      }

      if (missingVars.length === 0) {
        this.logResult({
          name: 'Environment Variables',
          status: 'PASS',
          details: 'All required environment variables present'
        });
      } else {
        this.logResult({
          name: 'Environment Variables',
          status: 'FAIL',
          details: `Missing variables: ${missingVars.join(', ')}`
        });
      }

    } catch (error) {
      this.logResult({
        name: 'Build Health Check',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log('\n🛑 Stopping development server...');
      this.serverProcess.kill('SIGTERM');
      
      // Give it a moment to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force kill if still running
      if (!this.serverProcess.killed) {
        this.serverProcess.kill('SIGKILL');
      }
      
      this.logResult({
        name: 'Server Shutdown',
        status: 'PASS',
        details: 'Development server stopped'
      });
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Development Server Test Suite...\n');

    try {
      await this.testBuildHealth();
      await this.startServer();
      
      if (this.serverStarted) {
        await this.testServerResponses();
        await this.testAPIEndpoints();
      }
      
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      await this.stopServer();
    }

    this.printSummary();
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SERVER TEST RESULTS SUMMARY');
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
          console.log(`   • ${r.name}: ${r.error || r.details}`);
        });
    }

    const successRate = passCount > 0 ? ((passCount / (passCount + failCount)) * 100).toFixed(1) : '0.0';
    console.log(`\n🎯 SUCCESS RATE: ${successRate}%`);
    
    if (failCount === 0) {
      console.log('\n🎉 All server tests passed! Development server is fully functional.');
    } else {
      console.log(`\n⚠️  ${failCount} test(s) failed. Please review the issues above.`);
    }

    console.log('\n💡 To manually test the admin dashboard:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Visit: http://localhost:3000/admin');
    console.log('   3. Sign in with an admin account');
    console.log('   4. Test all admin features');
  }
}

// Run the tests
const tester = new ServerTester();
tester.runAllTests().catch(console.error);

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await tester.stopServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await tester.stopServer();
  process.exit(0);
});