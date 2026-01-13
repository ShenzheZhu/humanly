import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { BRAND, getBrandText } from '@humory/shared';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: getBrandText().pageTitles.admin,
  description: 'A comprehensive text input provenance tracking and analysis platform',
  keywords: ['text tracking', 'keystroke analytics', 'form analytics', 'survey tracking'],
  authors: [{ name: `${BRAND.name} Team` }],
  openGraph: {
    title: getBrandText().pageTitles.admin,
    description: 'A comprehensive text input provenance tracking and analysis platform',
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
        {children}
      </body>
    </html>
  );
}
