import Link from 'next/link';
import { BRAND } from '@humory/shared';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">
            Welcome to <span className="text-primary">{BRAND.name}</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {BRAND.taglineAdmin}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
