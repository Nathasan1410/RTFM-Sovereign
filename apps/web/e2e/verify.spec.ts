import { test, expect } from '@playwright/test';

test.describe('Verify Page Flow', () => {
  test('should display credential card with score for valid address', async ({ page }) => {
    await page.goto('/verify/0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48');

    const skillInput = page.getByPlaceholder('Enter skill (e.g., \'react-card\')');
    await skillInput.fill('react-card');

    const verifyButton = page.getByRole('button', { name: 'Verify' });
    await verifyButton.click();

    await expect(page.getByText('Verified Skill Credential')).toBeVisible();

    const scoreElement = page.getByText(/\d+\/100/);
    await expect(scoreElement).toBeVisible();

    const score = await scoreElement.textContent();
    const scoreNumber = parseInt(score?.split('/')[0] || '0');
    expect(scoreNumber).toBeGreaterThan(0);
  });

  test('should display all trust indicators', async ({ page }) => {
    await page.goto('/verify/0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48');

    const skillInput = page.getByPlaceholder('Enter skill (e.g., \'react-card\')');
    await skillInput.fill('react-card');
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByText('Trust Indicators')).toBeVisible();
    await expect(page.getByText('Blockchain Verified')).toBeVisible();
    await expect(page.getByText('Verification Timestamp')).toBeVisible();
    await expect(page.getByText('Data Permanence')).toBeVisible();
  });

  test('should copy link to clipboard', async ({ page, context }) => {
    await page.goto('/verify/0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48');
    await page.getByPlaceholder('Enter skill (e.g., \'react-card\')').fill('react-card');
    await page.getByRole('button', { name: 'Verify' }).click();

    const copyButton = page.getByRole('button', { name: /Copy Link/i });
    await copyButton.click();

    await expect(page.getByText(/copied to clipboard/i)).toBeVisible({ timeout: 3000 });
  });

  test('should download PDF certificate', async ({ page, context }) => {
    await page.goto('/verify/0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48');
    await page.getByPlaceholder('Enter skill (e.g., \'react-card\')').fill('react-card');
    await page.getByRole('button', { name: 'Verify' }).click();

    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: /Download PDF/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^RTFM-.*\.pdf$/);
  });

  test('should display empty state for invalid address', async ({ page }) => {
    await page.goto('/verify/0x0000000000000000000000000000000000000000000000000');

    const skillInput = page.getByPlaceholder('Enter skill (e.g., \'react-card\')');
    await skillInput.fill('non-existent-skill');

    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByText('No Attestation Found')).toBeVisible();
    await expect(page.getByRole('button', { name: /Explore Skills/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Go Home/i })).toBeVisible();
  });
});
