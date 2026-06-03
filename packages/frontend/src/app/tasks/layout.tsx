'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { BasicInfoDialog } from '@/components/account/basic-info-dialog';
import { Navbar } from '@/components/navigation/navbar';

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const [basicInfoOpen, setBasicInfoOpen] = useState(false);

  useEffect(() => {
    // Always validate session on mount
    const validateSession = async () => {
      try {
        await fetchUser();
      } catch (error) {
        router.push('/login');
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [fetchUser, router]);

  useEffect(() => {
    if (!isValidating && isAuthenticated && user?.profileCompleted === false) {
      setBasicInfoOpen(true);
    }
  }, [isAuthenticated, isValidating, user?.profileCompleted]);

  // Show loading state while checking authentication
  if (isLoading || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children until authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BasicInfoDialog
        open={basicInfoOpen}
        mode="complete"
        onOpenChange={setBasicInfoOpen}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
