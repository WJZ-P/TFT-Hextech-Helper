import { test, expect } from '@playwright/test';

test.describe('Settings and Onboarding Flow', () => {
  test('should show onboarding tour on first launch', async ({ page }) => {
    // Note: In real electron environment, we'd need to mock the settings
    // This is a representative test structure for Playwright
    await page.goto('/');
    
    // Check if onboarding dialog is visible
    const onboardingTitle = page.locator('text=新手指南');
    await expect(onboardingTitle).toBeVisible();
    
    // Click through the tour
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("下一步")');
    }
    
    // Final step
    await page.click('button:has-text("开始使用")');
    await expect(onboardingTitle).not.toBeVisible();
  });

  test('should navigate through redesigned settings tabs', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to settings page (assume sidebar link exists)
    // For this test, we might need to mock or navigate directly if possible
    // Assuming /settings route exists in HashRouter
    await page.goto('/#/settings');
    
    // Check if redesigned settings page is visible
    await expect(page.locator('text=设置')).toBeVisible();
    
    // Check tabs
    const tabs = ['游戏设置', '自动化', '高级/日志', '关于'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`);
      await expect(tab).toBeVisible();
      await tab.click();
    }
    
    // Check specific settings in Automation tab
    await page.click('button:has-text("自动化")');
    await expect(page.locator('text=定时停止挂机')).toBeVisible();
    await expect(page.locator('text=排队随机间隔')).toBeVisible();
  });

  test('should toggle developer mode', async ({ page }) => {
    await page.goto('/#/settings');
    
    // Go to Advanced tab
    await page.click('button:has-text("高级/日志")');
    
    // Find developer mode switch
    const debugSwitch = page.locator('text=显示调试面板').locator('..').locator('..').locator('input[type="checkbox"]');
    
    // Toggle on
    await debugSwitch.check();
    // Assuming toast message appears
    await expect(page.locator('text=开启调试')).toBeVisible();
    
    // Toggle off
    await debugSwitch.uncheck();
    await expect(page.locator('text=隐藏调试')).toBeVisible();
  });
});
