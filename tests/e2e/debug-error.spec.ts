import { test } from '@playwright/test';

test('debug homepage error', async ({ page }) => {
  // Collect all console messages
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const pageErrors: Error[] = [];

  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error);
  });

  // Navigate to homepage
  await page.goto('/');

  // Wait for either success or error
  await page.waitForTimeout(5000);

  // Log all console messages
  console.log('\n=== Console Messages ===');
  consoleMessages.forEach((msg) => {
    console.log(`[${msg.type}] ${msg.text}`);
  });

  // Log all page errors
  console.log('\n=== Page Errors ===');
  pageErrors.forEach((error) => {
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });

  // Get page content
  const content = await page.content();
  console.log('\n=== Page HTML (first 1000 chars) ===');
  console.log(content.substring(0, 1000));

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-screenshot.png', fullPage: true });
  console.log('\n=== Screenshot saved to test-results/debug-screenshot.png ===');
});
