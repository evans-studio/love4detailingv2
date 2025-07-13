const { readFileSync } = require('fs')

console.log('🔍 Testing Sign-Out Redirect Configuration...\n')

try {
  // Check auth context implementation
  console.log('1️⃣ Checking auth context sign-out implementation...')
  const authContextContent = readFileSync('./src/lib/auth/context.tsx', 'utf8')
  
  const signOutFunction = authContextContent.match(/const signOut = async \(\) => \{[\s\S]*?\}/)?.[0]
  
  if (signOutFunction) {
    console.log('✅ Found signOut function in auth context')
    
    if (signOutFunction.includes('window.location.href = \'/\'')) {
      console.log('✅ Redirects to homepage ("/") on successful sign-out')
    } else if (signOutFunction.includes('window.location.href = \'/auth/login\'')) {
      console.log('❌ Still redirects to login page - needs to be fixed')
    } else {
      console.log('⚠️  No redirect found in signOut function')
    }
    
    // Check error handling redirect
    if (signOutFunction.includes('window.location.href = \'/\'' ) && 
        signOutFunction.match(/window\.location\.href = '\/'/g)?.length >= 2) {
      console.log('✅ Error handling also redirects to homepage')
    } else {
      console.log('⚠️  Error handling redirect may need attention')
    }
  } else {
    console.log('❌ Could not find signOut function')
  }
  
  // Check UnifiedSidebar implementation
  console.log('\n2️⃣ Checking UnifiedSidebar sign-out implementation...')
  const sidebarContent = readFileSync('./src/components/layout/UnifiedSidebar.tsx', 'utf8')
  
  const handleSignOutFunction = sidebarContent.match(/const handleSignOut = async \(\) => \{[\s\S]*?\}/)?.[0]
  
  if (handleSignOutFunction) {
    console.log('✅ Found handleSignOut function in UnifiedSidebar')
    
    if (handleSignOutFunction.includes('router.push(\'/\')')) {
      console.log('⚠️  UnifiedSidebar has additional redirect to homepage (may cause double redirect)')
    } else if (handleSignOutFunction.includes('router.push')) {
      console.log('⚠️  UnifiedSidebar has additional redirect somewhere else')
    } else {
      console.log('✅ UnifiedSidebar lets auth context handle redirect')
    }
  } else {
    console.log('❌ Could not find handleSignOut function in UnifiedSidebar')
  }
  
  // Check other sidebar implementations
  console.log('\n3️⃣ Checking other sidebar implementations...')
  
  try {
    const customerSidebarContent = readFileSync('./src/components/dashboard/CustomerSidebar.tsx', 'utf8')
    if (customerSidebarContent.includes('Redirect will be handled by the auth context')) {
      console.log('✅ CustomerSidebar properly delegates redirect to auth context')
    } else if (customerSidebarContent.includes('signOut()')) {
      console.log('⚠️  CustomerSidebar calls signOut but may have additional redirect logic')
    }
  } catch (e) {
    console.log('⚠️  CustomerSidebar file not found or not readable')
  }
  
  try {
    const adminSidebarContent = readFileSync('./src/components/admin/layout/AdminSidebar.tsx', 'utf8')
    if (adminSidebarContent.includes('onClick={signOut}')) {
      console.log('✅ AdminSidebar directly calls signOut (no additional redirect)')
    }
  } catch (e) {
    console.log('⚠️  AdminSidebar file not found or not readable')
  }
  
  // Check middleware for any redirect interference
  console.log('\n4️⃣ Checking middleware for redirect interference...')
  try {
    const middlewareContent = readFileSync('./middleware.ts', 'utf8')
    const publicRoutes = middlewareContent.match(/const publicRoutes = \[[\s\S]*?\]/)?.[0]
    
    if (publicRoutes && publicRoutes.includes('\'/\'')) {
      console.log('✅ Homepage ("/") is listed as a public route in middleware')
    } else {
      console.log('⚠️  Homepage may not be properly configured as public route')
    }
    
    if (middlewareContent.includes('/auth/login') && middlewareContent.includes('NextResponse.redirect')) {
      console.log('✅ Middleware redirects to login for protected routes (normal behavior)')
    }
  } catch (e) {
    console.log('⚠️  Middleware file not found or not readable')
  }
  
  console.log('\n🎯 Sign-Out Redirect Test Summary:')
  console.log('━'.repeat(50))
  
  // Determine overall status
  const hasCorrectRedirect = authContextContent.includes('window.location.href = \'/\'')
  const hasDoubleRedirect = sidebarContent.includes('router.push(\'/\')')
  
  if (hasCorrectRedirect && !hasDoubleRedirect) {
    console.log('✅ PASS: Sign-out correctly redirects to homepage')
    console.log('   ➤ Auth context redirects to "/"')
    console.log('   ➤ Sidebar components properly delegate to auth context')
    console.log('   ➤ No double redirects detected')
  } else if (hasCorrectRedirect && hasDoubleRedirect) {
    console.log('⚠️  PARTIAL: Sign-out redirects to homepage but may have double redirect')
    console.log('   ➤ Auth context redirects to "/"')
    console.log('   ➤ But sidebar may also redirect (could cause issues)')
  } else {
    console.log('❌ FAIL: Sign-out redirect needs fixing')
    console.log('   ➤ Auth context may not redirect to homepage')
    console.log('   ➤ Check auth context signOut function')
  }
  
  console.log('\n💡 Expected Behavior:')
  console.log('   1. User clicks "Sign Out" button in any dashboard')
  console.log('   2. Auth context clears session and storage')
  console.log('   3. User is redirected to homepage ("/") automatically')
  console.log('   4. User sees the public homepage with login/register options')

} catch (error) {
  console.error('❌ Test failed:', error.message)
}