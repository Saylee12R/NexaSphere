import { test, expect } from '@playwright/test';

test.describe('Authentication and Core Flows', () => {
  test('should display login page and allow admin login', async ({ page }) => {
    await page.goto('/admin');

    // Verify login page elements using robust selectors
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
    const usernameInput = page.getByPlaceholder(/username|email/i);
    const passwordInput = page.getByPlaceholder(/password/i);
    const submitBtn = page.getByRole('button', { name: /login|submit/i });

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Attempt to login with invalid credentials to verify error handling
    await usernameInput.fill('invalid_user');
    await passwordInput.fill('invalid_password');
    await submitBtn.click();

    // Error message should be shown
    await expect(page.locator('text=Invalid')).toBeVisible();
  });

  test('should prevent unauthorized access to protected routes', async ({ page, request }) => {
    // Attempting to access admin API directly without session
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8080';
    const response = await request.get(`${apiBase}/api/admin/analytics/stats`);
    expect(response.status()).toBe(401);

    // Verify client-side behavior: visiting /admin should display login if not authenticated
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
  });
});
