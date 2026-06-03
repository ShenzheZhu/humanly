'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { BasicInfoDialog } from '@/components/account/basic-info-dialog';
import { Navbar } from '@/components/navigation/navbar';
import { isGuestUserEmail } from '@/components/navigation/user-display';

export default function CertificatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [hasChecked, setHasChecked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [basicInfoOpen, setBasicInfoOpen] = useState(false);
  const requiresBasicInfo =
    isAuthenticated &&
    user?.profileCompleted === false &&
    !isGuestUserEmail(user?.email);

  useEffect(() => {
    if (!hasChecked) {
      checkAuth().finally(() => {
        setHasChecked(true);
        setIsCheckingAuth(false);
      });
    }
  }, [hasChecked, checkAuth]);

  useEffect(() => {
    if (hasChecked && !isCheckingAuth && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, hasChecked, isCheckingAuth]);

  useEffect(() => {
    if (hasChecked && !isCheckingAuth && !isLoading && requiresBasicInfo) {
      setBasicInfoOpen(true);
    }
  }, [hasChecked, isCheckingAuth, isLoading, requiresBasicInfo]);

  if (isCheckingAuth || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
