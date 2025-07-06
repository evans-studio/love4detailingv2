// This script monitors Vercel deployments
import { execSync } from 'child_process'
import chalk from 'chalk'

async function monitorDeployment() {
  console.log(chalk.blue('🚀 Monitoring Vercel deployment...\n'))
  
  try {
    // Get latest deployment URL using git info
    const repoUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    
    console.log(chalk.green(`📋 Deployment Info:`))
    console.log(`   Branch: ${branch}`)
    console.log(`   Commit: ${commit}`)
    console.log(`   Repository: ${repoUrl}`)
    
    console.log(chalk.yellow('\n📋 Testing Checklist:'))
    console.log('1. Test booking flow end-to-end')
    console.log('2. Check admin dashboard access')
    console.log('3. Verify email sending')
    console.log('4. Test on mobile devices')
    console.log('5. Check Vercel Functions logs')
    console.log('\n📝 Manual steps:')
    console.log('- Go to Vercel dashboard')
    console.log('- Find your deployment')
    console.log('- Click "Visit" to test')
    console.log('- Check function logs for errors')
    
  } catch (error) {
    console.error(chalk.red('❌ Deployment monitoring failed'), error)
  }
}

monitorDeployment()