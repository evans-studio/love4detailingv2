// This script validates environment variables match between local and production

import * as dotenv from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import chalk from 'chalk'

// Load both environment files
const localEnvExists = existsSync('.env.local')
const prodEnvExists = existsSync('.env.production')

if (!localEnvExists && !prodEnvExists) {
  console.log(chalk.red('❌ No environment files found (.env.local or .env.production)'))
  process.exit(1)
}

const localEnv = localEnvExists ? dotenv.parse(readFileSync('.env.local')) : {}
const prodEnv = prodEnvExists ? dotenv.parse(readFileSync('.env.production')) : {}

// Required variables for Love4Detailing
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_SITE_URL'
]

// Optional but important
const OPTIONAL_VARS = [
  'NEXT_PUBLIC_ENABLE_STRIPE',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
]

console.log(chalk.blue('🔍 Verifying environment variables...\n'))

// Check required variables
let hasErrors = false

REQUIRED_VARS.forEach(varName => {
  const localValue = localEnv[varName]
  const prodValue = prodEnv[varName]
  
  if (!localValue && localEnvExists) {
    console.log(chalk.red(`❌ Missing in .env.local: ${varName}`))
    hasErrors = true
  }
  
  if (!prodValue && prodEnvExists) {
    console.log(chalk.red(`❌ Missing in .env.production: ${varName}`))
    hasErrors = true
  }
  
  if (localValue && prodValue && localValue !== prodValue) {
    console.log(chalk.yellow(`⚠️  Different values for ${varName}`))
    console.log(`   Local: ${localValue.substring(0, 20)}...`)
    console.log(`   Prod:  ${prodValue.substring(0, 20)}...`)
  }
})

// Check Vercel-specific requirements
if (prodEnvExists && (!prodEnv.NEXT_PUBLIC_SITE_URL || prodEnv.NEXT_PUBLIC_SITE_URL === 'http://localhost:3000')) {
  console.log(chalk.red('❌ NEXT_PUBLIC_SITE_URL must be set to Vercel URL in production'))
  hasErrors = true
}

if (hasErrors) {
  console.log(chalk.red('\n❌ Environment validation failed!'))
  process.exit(1)
} else {
  console.log(chalk.green('\n✅ Environment variables validated!'))
}