import { test, expect } from '@playwright/test';
import { mockDocumentsApi, mockLoginFlow } from './helpers/mock-api';

test('creates a document and navigates to the editor', async ({ page }) => {
  await mockLoginFlow(page);
  const { document } = await mockDocumentsApi(page);

  await page.goto('/login');
  await page.getByLabel(/email address/i).fill('alice@example.com');
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/documents$/);

  await page.getByRole('button', { name: /new document/i }).click();
  await expect(page.getByRole('heading', { name: /create new document/i })).toBeVisible();

  await page.getByLabel(/document title/i).fill(document.title);
  await page.getByRole('button', { name: /create document/i }).click();

  await expect(page).toHaveURL(/\/documents\/doc-1$/);
  await expect(page.getByText(document.title).first()).toBeVisible();
});
