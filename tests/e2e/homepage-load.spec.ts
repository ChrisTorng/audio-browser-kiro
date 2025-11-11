import { test, expect } from '@playwright/test';

test.describe('Homepage Load', () => {
  test('should load homepage without errors', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to homepage
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('.audio-browser', { timeout: 10000 });

    // Wait a bit for any async errors to appear
    await page.waitForTimeout(2000);

    // Check for the specific error mentioned by user
    const hasObjectValuesError = consoleErrors.some(
      (error) =>
        error.includes('Cannot convert undefined or null to object') ||
        error.includes('Object.values')
    );

    const hasPageError = pageErrors.some(
      (error) =>
        error.message.includes('Cannot convert undefined or null to object') ||
        error.message.includes('Object.values')
    );

    // Log all errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('Page Errors:', pageErrors.map((e) => e.message));
    }

    // Take screenshot if there are errors
    if (hasObjectValuesError || hasPageError) {
      await page.screenshot({ path: 'test-results/error-screenshot.png', fullPage: true });
    }

    // Assert no Object.values errors
    expect(hasObjectValuesError, 'Should not have Object.values console errors').toBe(false);
    expect(hasPageError, 'Should not have Object.values page errors').toBe(false);

    // Verify the page loaded correctly
    await expect(page.locator('.audio-browser')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('should display audio tree or loading state', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('.audio-browser', { timeout: 10000 });

    // Should show either loading spinner or audio tree
    const hasLoadingSpinner = await page.locator('.loading-spinner').isVisible();
    const hasAudioTree = await page.locator('.audio-tree').isVisible();
    const hasEmptyMessage = await page.locator('.audio-browser__empty').isVisible();

    expect(
      hasLoadingSpinner || hasAudioTree || hasEmptyMessage,
      'Should show loading, tree, or empty message'
    ).toBe(true);
  });

  test('should not have React errors in ErrorBoundary', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('.audio-browser', { timeout: 10000 });

    // Wait for any potential errors to appear
    await page.waitForTimeout(2000);

    // Check if ErrorBoundary caught any errors
    const errorBoundaryMessage = await page.locator('text=/Something went wrong/i').count();
    expect(errorBoundaryMessage, 'Should not show ErrorBoundary error message').toBe(0);
  });
});
