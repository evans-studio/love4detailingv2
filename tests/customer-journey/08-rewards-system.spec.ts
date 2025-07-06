import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser, generateVehicle, generateBooking } from '../helpers/test-data';

test.describe('Rewards System', () => {
  let helpers: TestHelpers;
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testUser = generateUser();
    
    // Register and login user
    await helpers.registerUser(testUser);
  });

  test('should display rewards dashboard', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should show rewards overview
    await expect(page.locator('.rewards-overview')).toBeVisible();
    await expect(page.locator('text=Rewards Points')).toBeVisible();
    await expect(page.locator('text=Current Tier')).toBeVisible();
    
    // Should show points balance
    await expect(page.locator('.points-balance')).toBeVisible();
    
    // Should show tier information
    await expect(page.locator('.tier-info')).toBeVisible();
  });

  test('should show points accumulation after booking', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Check initial points balance
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    const initialPointsText = await page.locator('.points-balance').textContent();
    const initialPoints = parseInt(initialPointsText.replace(/\D/g, ''));
    
    // Create a booking
    await helpers.addVehicle(vehicle);
    await helpers.createBooking(booking);
    
    // Check updated points balance
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    const updatedPointsText = await page.locator('.points-balance').textContent();
    const updatedPoints = parseInt(updatedPointsText.replace(/\D/g, ''));
    
    // Points should have increased
    expect(updatedPoints).toBeGreaterThan(initialPoints);
  });

  test('should display rewards transaction history', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should show transaction history section
    await expect(page.locator('.transaction-history')).toBeVisible();
    await expect(page.locator('text=Transaction History')).toBeVisible();
    
    // Should show transaction entries
    const transactions = page.locator('.transaction-item');
    const count = await transactions.count();
    
    if (count > 0) {
      // Each transaction should show details
      await expect(transactions.first().locator('.transaction-date')).toBeVisible();
      await expect(transactions.first().locator('.transaction-amount')).toBeVisible();
      await expect(transactions.first().locator('.transaction-description')).toBeVisible();
    }
  });

  test('should show tier progression', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should show current tier
    await expect(page.locator('.current-tier')).toBeVisible();
    
    // Should show tier benefits
    await expect(page.locator('.tier-benefits')).toBeVisible();
    
    // Should show progress to next tier
    await expect(page.locator('.tier-progress')).toBeVisible();
    
    // Should show next tier requirements
    await expect(page.locator('.next-tier-requirements')).toBeVisible();
  });

  test('should display available rewards', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should show available rewards section
    await expect(page.locator('.available-rewards')).toBeVisible();
    
    // Should show reward options
    const rewardOptions = page.locator('.reward-option');
    const count = await rewardOptions.count();
    
    if (count > 0) {
      // Each reward should show details
      await expect(rewardOptions.first().locator('.reward-name')).toBeVisible();
      await expect(rewardOptions.first().locator('.reward-points')).toBeVisible();
      await expect(rewardOptions.first().locator('.reward-description')).toBeVisible();
    }
  });

  test('should allow redeeming rewards', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Look for redeemable rewards
    const redeemButton = page.locator('.redeem-button').first();
    
    if (await redeemButton.isVisible()) {
      const pointsBeforeText = await page.locator('.points-balance').textContent();
      const pointsBefore = parseInt(pointsBeforeText.replace(/\D/g, ''));
      
      await redeemButton.click();
      
      // Should show confirmation dialog
      await expect(page.locator('.redemption-confirmation')).toBeVisible();
      await page.click('button:has-text("Confirm Redemption")');
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      
      // Points should be deducted
      const pointsAfterText = await page.locator('.points-balance').textContent();
      const pointsAfter = parseInt(pointsAfterText.replace(/\D/g, ''));
      
      expect(pointsAfter).toBeLessThan(pointsBefore);
    }
  });

  test('should show points expiration information', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should show points expiration info
    const expirationInfo = page.locator('.points-expiration');
    
    if (await expirationInfo.isVisible()) {
      await expect(page.locator('text=expire')).toBeVisible();
      await expect(page.locator('text=Valid until')).toBeVisible();
    }
  });

  test('should calculate tier benefits correctly', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should show tier-specific benefits
    await expect(page.locator('.tier-benefits')).toBeVisible();
    
    // Benefits should include
    const benefitsList = page.locator('.benefit-item');
    const count = await benefitsList.count();
    
    if (count > 0) {
      // Should show discount percentages
      await expect(page.locator('text=%')).toBeVisible();
      
      // Should show special perks
      await expect(page.locator('text=priority, text=exclusive')).toBeVisible();
    }
  });

  test('should handle insufficient points for redemption', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Look for high-value rewards that user can't afford
    const expensiveRewards = page.locator('.reward-option .redeem-button[disabled]');
    const count = await expensiveRewards.count();
    
    if (count > 0) {
      // Should show disabled state
      await expect(expensiveRewards.first()).toBeDisabled();
      
      // Should show insufficient points message
      await expect(page.locator('text=Insufficient points')).toBeVisible();
    }
  });

  test('should show referral rewards', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should show referral section
    const referralSection = page.locator('.referral-rewards');
    
    if (await referralSection.isVisible()) {
      await expect(page.locator('text=Refer a Friend')).toBeVisible();
      await expect(page.locator('text=referral code')).toBeVisible();
      
      // Should show referral bonus information
      await expect(page.locator('.referral-bonus')).toBeVisible();
    }
  });

  test('should display loyalty program rules', async ({ page }) => {
    await page.click('text=Rewards');
    await page.waitForURL('/dashboard/rewards');
    
    // Should have link to program rules
    await expect(page.locator('text=Program Rules, text=Terms & Conditions')).toBeVisible();
    
    // Click to view rules
    await page.click('text=Program Rules');
    
    // Should show detailed rules
    await expect(page.locator('.program-rules')).toBeVisible();
    await expect(page.locator('text=How to earn points')).toBeVisible();
    await expect(page.locator('text=Point values')).toBeVisible();
    await expect(page.locator('text=Expiration policy')).toBeVisible();
  });
});