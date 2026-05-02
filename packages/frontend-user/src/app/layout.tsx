import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { BRAND, getBrandText } from '@humory/shared';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { PolyfillProvider } from '@/components/polyfill-provider';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        <PolyfillProvider>
          {children}
          <Toaster />
        </PolyfillProvider>
      </body>
    </html>
  );
}
