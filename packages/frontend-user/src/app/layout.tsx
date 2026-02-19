import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { BRAND, getBrandText } from '@humory/shared';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { PolyfillProvider } from '@/components/polyfill-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: getBrandText().pageTitles.user,
  description: 'Verify and certify human-written content through behavioral keystroke tracking. Generate cryptographically signed certificates proving authentic human authorship.',
  keywords: ['human authorship', 'authorship verification', 'keystroke tracking', 'writing certification', 'AI detection', 'human proof'],
  authors: [{ name: `${BRAND.name} Team` }],
  icons: { icon: '/humanly.svg' },
  openGraph: {
    title: getBrandText().pageTitles.user,
    description: 'Verify human-written content with behavioral proof and cryptographic certificates',
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
