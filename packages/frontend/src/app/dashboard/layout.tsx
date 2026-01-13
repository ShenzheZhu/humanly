'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Always validate session on mount, even if isAuthenticated is true from localStorage
    const validateSession = async () => {
      try {
        // Validate the token with the server
        // Token may be in localStorage OR in httpOnly cookie
        await fetchUser();
      } catch (error) {
        // Validation failed, redirect to login
        router.push('/login');
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [fetchUser, router]);

  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard layout with sidebar, header, etc. will be added later */}
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  );
}
