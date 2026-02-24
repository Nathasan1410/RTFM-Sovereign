import { test, expect } from '@playwright/test';

test.describe('Demo Mode', () => {
  test('should activate demo mode with Shift+D x3', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyD');
    await page.keyboard.up('Shift');

    await page.waitForTimeout(1000);

    const badge = page.getByText(/DEMO MODE/i);
    await expect(badge).toBeVisible();
  });

  test('should display mock data when demo mode is active', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('RTFM_DEMO_MODE', 'true');
    });

    await page.goto('/verify/0x0000000000000000000000000000000000000000000000');

    const skillInput = page.getByPlaceholder('Enter skill (e.g., \'react-card\')');
    await skillInput.fill('react-card');
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByText('Verified Skill Credential')).toBeVisible();
    const scoreElement = page.getByText(/\d+\/100/);
    await expect(scoreElement).toBeVisible();

    const badge = page.getByText(/DEMO MODE/i);
    await expect(badge).toBeVisible();
  });

  test('should disable demo mode when badge is clicked', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('RTFM_DEMO_MODE', 'true');
    });

    await page.goto('/');

    const badge = page.getByText(/DEMO MODE/i).first();
    await expect(badge).toBeVisible();

    await badge.click();

    const modalTitle = page.getByText('Disable Demo Mode?');
    await expect(modalTitle).toBeVisible();

    const disableButton = page.getByRole('button', { name: 'Disable' });
    await disableButton.click();

    await page.waitForTimeout(1000);

    await expect(badge).not.toBeVisible();
    await page.goto('/');

    const newBadge = page.getByText(/DEMO MODE/i);
    await expect(newBadge).not.toBeVisible();
  });
});
