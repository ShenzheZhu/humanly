'use client';

import { useEffect } from 'react';
import { polyfillCryptoRandomUUID } from '@/lib/polyfills';

/**
 * Component that initializes polyfills on the client side
 */
export function PolyfillProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize polyfills as early as possible
    polyfillCryptoRandomUUID();
  }, []);

  return <>{children}</>;
}
