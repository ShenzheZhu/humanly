
import { test, expect } from '@playwright/test';

test('redirects unauthenticated users from documents to login', async ({ page }) => {
  await page.goto('/documents');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});
