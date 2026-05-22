import type { Metadata } from 'next';
import { Courier_Prime, Space_Mono } from 'next/font/google';
import { BRAND, getBrandText } from '@humanly/shared';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { PolyfillProvider } from '@/components/polyfill-provider';

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-humanly-brand',
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3002'),

  title: getBrandText().pageTitles.user,
  description: 'Verify and certify human-written content through behavioral keystroke tracking...',
  keywords: ['human authorship', 'authorship verification', 'keystroke tracking'],
  authors: [{ name: `${BRAND.name} Team` }],
  icons: { icon: '/icon.svg' },

  openGraph: {
    title: getBrandText().pageTitles.user,
    description: 'Trustworthy environment for human-ai collaborative writing',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceMono.variable} ${courierPrime.variable}`}>
        <PolyfillProvider>
          {children}
          <Toaster />
        </PolyfillProvider>
      </body>
    </html>
  );
}
