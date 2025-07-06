const { chromium } = require('playwright');

const BASE_URL = 'https://love4detailingv2.vercel.app';

async function investigateErrors() {
  console.log('🔍 Investigating specific errors on pages...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log(`🌐 Console [${msg.type()}]:`, msg.text()));
  page.on('pageerror', error => console.error('💥 Page Error:', error.message));
  
  try {
    // Check Homepage
    console.log('\n📱 Checking Homepage...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const pageText = await page.textContent('body');
    console.log('Page title:', await page.title());
    console.log('URL after navigation:', page.url());
    
    // Check for error messages
    if (pageText.toLowerCase().includes('error')) {
      console.log('❌ Error found on homepage');
      console.log('Error text snippet:', pageText.substring(0, 500));
    } else {
      console.log('✅ Homepage appears to load correctly');
    }
    
    // Check for Book button
    const bookButtons = await page.locator('a:has-text("Book"), button:has-text("Book"), [href*="/book"]').count();
    console.log(`📊 Found ${bookButtons} book button(s)`);
    
    if (bookButtons > 0) {
      const firstBookButton = page.locator('a:has-text("Book"), button:has-text("Book"), [href*="/book"]').first();
      const buttonText = await firstBookButton.textContent();
      const buttonHref = await firstBookButton.getAttribute('href');
      console.log(`Book button text: "${buttonText}", href: "${buttonHref}"`);
    }
    
    // Check Booking Page
    console.log('\n🚗 Checking Booking Page...');
    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState('networkidle');
    
    const bookingPageText = await page.textContent('body');
    console.log('Booking page URL:', page.url());
    
    if (bookingPageText.toLowerCase().includes('error')) {
      console.log('❌ Error found on booking page');
      console.log('Error text snippet:', bookingPageText.substring(0, 500));
    } else {
      console.log('✅ Booking page appears to load correctly');
    }
    
    // Look for registration input
    const regInputs = await page.locator('input[placeholder*="reg" i], input[name*="reg" i], input[type="text"]').count();
    console.log(`📊 Found ${regInputs} potential registration input(s)`);
    
    if (regInputs > 0) {
      for (let i = 0; i < regInputs; i++) {
        const input = page.locator('input[placeholder*="reg" i], input[name*="reg" i], input[type="text"]').nth(i);
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        console.log(`Input ${i + 1}: placeholder="${placeholder}", name="${name}"`);
      }
    }
    
    // Check for form elements
    const forms = await page.locator('form').count();
    const inputs = await page.locator('input').count();
    const buttons = await page.locator('button').count();
    console.log(`📊 Page elements: ${forms} forms, ${inputs} inputs, ${buttons} buttons`);
    
    // Check Auth Pages
    console.log('\n🔐 Checking Auth Pages...');
    
    const authPages = [
      '/auth/sign-in',
      '/auth/sign-up', 
      '/auth/login',
      '/auth/admin-login'
    ];
    
    for (const authPath of authPages) {
      console.log(`\nChecking ${authPath}...`);
      await page.goto(`${BASE_URL}${authPath}`);
      await page.waitForLoadState('networkidle');
      
      const authPageText = await page.textContent('body');
      console.log(`URL: ${page.url()}`);
      
      if (authPageText.toLowerCase().includes('error')) {
        console.log(`❌ Error found on ${authPath}`);
        console.log('Error text snippet:', authPageText.substring(0, 300));
      } else {
        console.log(`✅ ${authPath} appears to load correctly`);
      }
      
      const emailInputs = await page.locator('input[type="email"]').count();
      const passwordInputs = await page.locator('input[type="password"]').count();
      console.log(`📊 Form elements: ${emailInputs} email inputs, ${passwordInputs} password inputs`);
    }
    
    // Check Network Errors
    console.log('\n🌐 Checking for network issues...');
    await page.goto(BASE_URL);
    
    const response = await page.goto(BASE_URL);
    console.log(`Response status: ${response.status()}`);
    console.log(`Response headers:`, await response.allHeaders());
    
  } catch (error) {
    console.error('💥 Investigation failed:', error);
  } finally {
    await browser.close();
  }
}

investigateErrors().catch(console.error);