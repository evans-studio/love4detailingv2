const puppeteer = require('puppeteer');

async function testDynamicNavigation() {
  console.log('🧪 Testing Dynamic Navigation Header...\n');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    console.log('✅ Page loaded successfully');
    
    // Test 1: Header visibility on page load
    const headerVisible = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return false;
      
      const style = window.getComputedStyle(header);
      return style.opacity !== '0' && style.transform !== 'translateY(-100%)';
    });
    
    console.log('📋 Header visible on load:', headerVisible ? '✅' : '❌');
    
    // Test 2: Scroll down behavior
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(500);
    
    const headerHiddenAfterScroll = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return false;
      
      const style = window.getComputedStyle(header);
      return style.transform.includes('translateY(-100%)') || style.opacity === '0';
    });
    
    console.log('📋 Header hides on scroll down:', headerHiddenAfterScroll ? '✅' : '❌');
    
    // Test 3: Scroll up behavior
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(500);
    
    const headerVisibleAfterScrollUp = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return false;
      
      const style = window.getComputedStyle(header);
      return style.opacity !== '0' && !style.transform.includes('translateY(-100%)');
    });
    
    console.log('📋 Header shows on scroll up:', headerVisibleAfterScrollUp ? '✅' : '❌');
    
    // Test 4: Navigation links functionality
    const navigationLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('header a[href^="#"]');
      return Array.from(links).map(link => ({
        text: link.textContent.trim(),
        href: link.getAttribute('href')
      }));
    });
    
    console.log('📋 Navigation links found:');
    navigationLinks.forEach(link => {
      console.log(`   - ${link.text}: ${link.href}`);
    });
    
    // Test 5: Mobile menu functionality
    await page.setViewport({ width: 375, height: 812 }); // iPhone X dimensions
    await page.waitForTimeout(500);
    
    const mobileMenuButton = await page.$('header button[aria-label*="menu" i], header button:has(svg)');
    const hasMobileMenu = !!mobileMenuButton;
    
    console.log('📋 Mobile menu button present:', hasMobileMenu ? '✅' : '❌');
    
    if (hasMobileMenu) {
      await mobileMenuButton.click();
      await page.waitForTimeout(300);
      
      const mobileMenuVisible = await page.evaluate(() => {
        const overlay = document.querySelector('[class*="inset-0"][class*="z-40"]');
        return !!overlay;
      });
      
      console.log('📋 Mobile menu opens correctly:', mobileMenuVisible ? '✅' : '❌');
    }
    
    console.log('\n🎉 Navigation testing completed!');
    
    // Keep browser open for manual testing
    console.log('\n⏰ Browser will remain open for manual testing...');
    console.log('Press Ctrl+C to close when done testing');
    
    await page.waitForTimeout(30000); // Wait 30 seconds for manual testing
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error during navigation testing:', error.message);
  }
}

// Check if puppeteer is available
try {
  testDynamicNavigation();
} catch (error) {
  console.log('ℹ️  To run automated tests, install puppeteer:');
  console.log('npm install puppeteer');
  console.log('\nFor now, please test manually:');
  console.log('1. Open http://localhost:3000');
  console.log('2. Check header visibility on page load');
  console.log('3. Scroll down to see header hide');
  console.log('4. Scroll up to see header reappear');
  console.log('5. Test mobile menu on small screens');
  console.log('6. Test navigation links functionality');
}