import Link from 'next/link';
import { BRAND } from '@humory/shared';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity">
              {BRAND.name}
            </h1>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            {BRAND.taglineUser}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
