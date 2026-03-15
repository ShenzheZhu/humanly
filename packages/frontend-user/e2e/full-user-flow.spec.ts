import { test, expect } from '@playwright/test';
import { mockCertificatesApi, mockDocumentsApi, mockLoginFlow } from './helpers/mock-api';

test('completes the core user flow from login to certificate sharing', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await mockLoginFlow(page);
  const { document } = await mockDocumentsApi(page);
  const { certificate } = await mockCertificatesApi(page);

  await page.goto('/login');
  await page.getByLabel(/email address/i).fill('alice@example.com');
  await page.getByLabel(/^password$/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/documents$/);
  await page.getByRole('button', { name: /new document/i }).click();
  await expect(page.getByRole('heading', { name: /create new document/i })).toBeVisible();

  await page.getByLabel(/document title/i).fill('Draft From Upload');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
  });

  await page.getByLabel(/document title/i).fill(document.title);
  await page.getByRole('button', { name: /create & upload pdf/i }).click();

  await expect(page).toHaveURL(/\/documents\/doc-1$/);
  await expect(page.getByText(document.title).first()).toBeVisible();

  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await editor.fill('This is a human-written draft for certificate generation.');
  await expect(editor).toContainText('This is a human-written draft for certificate generation.');

  await page.getByRole('button', { name: /generate certificate/i }).click();
  await expect(page.getByRole('heading', { name: /generate certificate/i })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /^generate certificate$/i }).click();

  await expect(page).toHaveURL(/\/certificates\/cert-1$/);
  await expect(page.getByRole('heading', { name: certificate.title })).toBeVisible();

  await page.getByRole('button', { name: /share link/i }).click();
  await expect(page.getByText(/verification link copied to clipboard/i)).toBeVisible();
});
