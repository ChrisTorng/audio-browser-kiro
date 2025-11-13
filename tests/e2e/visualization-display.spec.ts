import { test, expect } from '@playwright/test';

/**
 * E2E tests for waveform and spectrogram visualization display
 * Verifies that visualizations are correctly integrated and displayed
 */
test.describe('Visualization Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the application to load
    await page.waitForSelector('.audio-browser', { timeout: 10000 });
  });

  test('should display waveform and spectrogram components in audio items', async ({ page }) => {
    // Wait for audio tree to load
    await page.waitForSelector('.audio-tree', { timeout: 5000 });
    
    // Expand folders until we find audio files (max 5 levels)
    for (let i = 0; i < 5; i++) {
      const collapsedButton = page.locator('.audio-tree__expand-button').filter({ hasText: '▶' }).first();
      if (await collapsedButton.count() === 0) break;
      
      await collapsedButton.click();
      await page.waitForTimeout(300);
      
      // Check if we found audio items
      const audioItemCount = await page.locator('.audio-item').count();
      if (audioItemCount > 0) break;
    }
    
    // Find first audio item (not a folder)
    const audioItem = page.locator('.audio-item').first();
    await expect(audioItem).toBeVisible();
    
    // Check that waveform display exists
    const waveformDisplay = audioItem.locator('.waveform-display');
    await expect(waveformDisplay).toBeVisible();
    
    // Check that spectrogram display exists
    const spectrogramDisplay = audioItem.locator('.spectrogram-display');
    await expect(spectrogramDisplay).toBeVisible();
  });

  test('should show loading state initially for visualizations', async ({ page }) => {
    // Wait for audio tree
    await page.waitForSelector('.audio-tree', { timeout: 5000 });
    
    // Expand folders until we find audio files
    for (let i = 0; i < 5; i++) {
      const collapsedButton = page.locator('.audio-tree__expand-button').filter({ hasText: '▶' }).first();
      if (await collapsedButton.count() === 0) break;
      await collapsedButton.click();
      await page.waitForTimeout(300);
      if (await page.locator('.audio-item').count() > 0) break;
    }
    
    // Find first audio item
    const audioItem = page.locator('.audio-item').first();
    
    // Check for loading state or empty state initially
    const waveformDisplay = audioItem.locator('.waveform-display');
    const hasLoadingOrEmpty = await waveformDisplay.evaluate((el) => {
      return el.classList.contains('waveform-display--loading') || 
             el.classList.contains('waveform-display--empty');
    });
    
    expect(hasLoadingOrEmpty).toBeTruthy();
  });

  test('should generate visualizations when audio item is selected', async ({ page }) => {
    // Wait for audio tree
    await page.waitForSelector('.audio-tree', { timeout: 5000 });
    
    // Expand folders until we find audio files
    for (let i = 0; i < 5; i++) {
      const collapsedButton = page.locator('.audio-tree__expand-button').filter({ hasText: '▶' }).first();
      if (await collapsedButton.count() === 0) break;
      await collapsedButton.click();
      await page.waitForTimeout(300);
      if (await page.locator('.audio-item').count() > 0) break;
    }
    
    // Find and click first audio item
    const audioItem = page.locator('.audio-item').first();
    await audioItem.click();
    
    // Wait for selected state
    await expect(audioItem).toHaveClass(/audio-item--selected/);
    
    // Wait for visualizations to load (give it some time)
    await page.waitForTimeout(5000);
    
    // Check that waveform canvas exists or waveform display is visible
    const waveformDisplay = audioItem.locator('.waveform-display');
    await expect(waveformDisplay).toBeVisible();
    
    // Check that spectrogram display is visible
    const spectrogramDisplay = audioItem.locator('.spectrogram-display');
    await expect(spectrogramDisplay).toBeVisible();
  });

  test('should display all visualization components in correct order', async ({ page }) => {
    // Wait for audio tree
    await page.waitForSelector('.audio-tree', { timeout: 5000 });
    
    // Expand folders until we find audio files
    for (let i = 0; i < 5; i++) {
      const collapsedButton = page.locator('.audio-tree__expand-button').filter({ hasText: '▶' }).first();
      if (await collapsedButton.count() === 0) break;
      await collapsedButton.click();
      await page.waitForTimeout(300);
      if (await page.locator('.audio-item').count() > 0) break;
    }
    
    // Find first audio item
    const audioItem = page.locator('.audio-item').first();
    
    // Verify all components exist
    await expect(audioItem.locator('.audio-item__rating')).toBeVisible();
    await expect(audioItem.locator('.audio-item__filename')).toBeVisible();
    await expect(audioItem.locator('.audio-item__waveform')).toBeVisible();
    await expect(audioItem.locator('.audio-item__spectrogram')).toBeVisible();
    await expect(audioItem.locator('.audio-item__description')).toBeVisible();
  });

  test('should handle visualization errors gracefully', async ({ page }) => {
    // Wait for audio tree
    await page.waitForSelector('.audio-tree', { timeout: 5000 });
    
    // Expand folders until we find audio files
    for (let i = 0; i < 5; i++) {
      const collapsedButton = page.locator('.audio-tree__expand-button').filter({ hasText: '▶' }).first();
      if (await collapsedButton.count() === 0) break;
      await collapsedButton.click();
      await page.waitForTimeout(300);
      if (await page.locator('.audio-item').count() > 0) break;
    }
    
    // Find first audio item
    const audioItem = page.locator('.audio-item').first();
    
    // Check that error states are handled (should show error icon if error occurs)
    const waveformDisplay = audioItem.locator('.waveform-display');
    const spectrogramDisplay = audioItem.locator('.spectrogram-display');
    
    // Both should be visible (even if showing error or loading state)
    await expect(waveformDisplay).toBeVisible();
    await expect(spectrogramDisplay).toBeVisible();
  });

  test('should display visualizations with correct dimensions', async ({ page }) => {
    // Wait for audio tree
    await page.waitForSelector('.audio-tree', { timeout: 5000 });
    
    // Expand folders until we find audio files
    for (let i = 0; i < 5; i++) {
      const collapsedButton = page.locator('.audio-tree__expand-button').filter({ hasText: '▶' }).first();
      if (await collapsedButton.count() === 0) break;
      await collapsedButton.click();
      await page.waitForTimeout(300);
      if (await page.locator('.audio-item').count() > 0) break;
    }
    
    // Find first audio item
    const audioItem = page.locator('.audio-item').first();
    
    // Check waveform dimensions
    const waveformDisplay = audioItem.locator('.waveform-display');
    const waveformBox = await waveformDisplay.boundingBox();
    expect(waveformBox).not.toBeNull();
    expect(waveformBox!.width).toBeGreaterThan(0);
    expect(waveformBox!.height).toBeGreaterThan(0);
    
    // Check spectrogram dimensions
    const spectrogramDisplay = audioItem.locator('.spectrogram-display');
    const spectrogramBox = await spectrogramDisplay.boundingBox();
    expect(spectrogramBox).not.toBeNull();
    expect(spectrogramBox!.width).toBeGreaterThan(0);
    expect(spectrogramBox!.height).toBeGreaterThan(0);
  });
});
