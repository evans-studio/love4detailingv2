#!/usr/bin/env node

/**
 * Authentication Debug Script
 * 
 * This script helps diagnose authentication issues by:
 * 1. Checking environment variables
 * 2. Testing Supabase connection
 * 3. Validating authentication configuration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔍 AUTHENTICATION DEBUG SCRIPT');
console.log('=' .repeat(50));

// 1. Check environment variables
console.log('\n📋 ENVIRONMENT VARIABLES:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ MISSING');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `✅ ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : '❌ MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...` : '❌ MISSING');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? `✅ ${process.env.RESEND_API_KEY.substring(0, 10)}...` : '❌ MISSING');
console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || '❌ MISSING');

// 2. Check .env files
console.log('\n📁 ENVIRONMENT FILES:');
const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// 3. Test Supabase connection
console.log('\n🔗 SUPABASE CONNECTION TEST:');
async function testSupabaseConnection() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log('❌ Missing required Supabase environment variables');
      return;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log('✅ Supabase client created successfully');
    console.log('📍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🔑 Anon Key:', `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...`);

    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('⚠️  Auth session error:', error.message);
    } else {
      console.log('✅ Auth session check successful');
      console.log('👤 Current session:', data.session ? 'Active' : 'None');
    }

    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Database connection error:', testError.message);
    } else {
      console.log('✅ Database connection successful');
    }

  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
  }
}

// 4. Check Next.js configuration
console.log('\n⚙️  NEXT.JS CONFIGURATION:');
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  console.log('✅ next.config.js exists');
  try {
    const nextConfig = require(nextConfigPath);
    console.log('📦 React Strict Mode:', nextConfig.reactStrictMode ? 'Enabled' : 'Disabled');
    console.log('🧪 Experimental features:', nextConfig.experimental ? 'Present' : 'None');
  } catch (error) {
    console.log('⚠️  Error reading next.config.js:', error.message);
  }
} else {
  console.log('❌ next.config.js missing');
}

// 5. Check middleware configuration
console.log('\n🛡️  MIDDLEWARE CONFIGURATION:');
const middlewarePath = path.join(process.cwd(), 'middleware.ts');
if (fs.existsSync(middlewarePath)) {
  console.log('✅ middleware.ts exists');
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
  console.log('🔒 Protected routes configured:', middlewareContent.includes('protectedApiRoutes'));
  console.log('👑 Admin routes configured:', middlewareContent.includes('adminRoutes'));
  console.log('👤 Customer routes configured:', middlewareContent.includes('customerRoutes'));
} else {
  console.log('❌ middleware.ts missing');
}

// 6. Check package.json for auth dependencies
console.log('\n📦 AUTHENTICATION DEPENDENCIES:');
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const authDeps = [
    '@supabase/supabase-js',
    '@supabase/auth-helpers-nextjs',
    '@supabase/auth-ui-react',
    '@supabase/auth-ui-shared'
  ];
  
  authDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: missing`);
    }
  });
} else {
  console.log('❌ package.json missing');
}

// Run the tests
testSupabaseConnection().then(() => {
  console.log('\n🎯 DEBUGGING RECOMMENDATIONS:');
  console.log('1. Check browser console for detailed authentication logs');
  console.log('2. Verify environment variables are loaded correctly');
  console.log('3. Test authentication flow step by step');
  console.log('4. Check network requests in browser dev tools');
  console.log('5. Verify Supabase project settings and RLS policies');
  console.log('\n✅ Debug script completed');
}).catch(error => {
  console.error('❌ Debug script failed:', error);
});