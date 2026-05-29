import { render, screen } from '@testing-library/react';

import AuthLayout from '@/app/(auth)/layout';
import { adminHref, marketingHref, productAppHref } from '@/lib/app-origin';

describe('marketing and product origins', () => {
  const originalMarketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN;
  const originalProductAppOrigin = process.env.NEXT_PUBLIC_PRODUCT_APP_ORIGIN;
  const originalAdminOrigin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN;

  const restoreOrigins = () => {
    if (originalMarketingOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_MARKETING_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_MARKETING_ORIGIN = originalMarketingOrigin;
    }

    if (originalProductAppOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_PRODUCT_APP_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_PRODUCT_APP_ORIGIN = originalProductAppOrigin;
    }

    if (originalAdminOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_ADMIN_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_ADMIN_ORIGIN = originalAdminOrigin;
    }
  };

  beforeEach(() => {
    restoreOrigins();
  });

  it('centralizes external origin mapping without component-level hardcoding', () => {
    process.env.NEXT_PUBLIC_MARKETING_ORIGIN = 'https://writehumanly.net/';
    process.env.NEXT_PUBLIC_PRODUCT_APP_ORIGIN = 'https://app.writehumanly.net/';
    process.env.NEXT_PUBLIC_ADMIN_ORIGIN = 'https://admin.writehumanly.net/';

    expect(marketingHref('/')).toBe('https://writehumanly.net/');
    expect(productAppHref('/register')).toBe('https://app.writehumanly.net/register');
    expect(adminHref('/')).toBe('https://admin.writehumanly.net/');
  });

  it('falls back to the production admin portal for explicit cross-role links', () => {
    expect(adminHref('/', { allowRelativeInNonProduction: false })).toBe(
      'https://admin.writehumanly.net/'
    );
  });

  it('sends auth-layout logo clicks back to the marketing homepage', () => {
    process.env.NEXT_PUBLIC_MARKETING_ORIGIN = 'https://writehumanly.net';

    render(
      <AuthLayout>
        <div>auth content</div>
      </AuthLayout>
    );

    expect(screen.getByRole('link', { name: 'Humanly' })).toHaveAttribute(
      'href',
      'https://writehumanly.net/'
    );
  });
});
