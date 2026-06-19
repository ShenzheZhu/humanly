'use client';

import { type MutableRefObject, useLayoutEffect, useRef, useState } from 'react';

import { TokenManager } from '@/lib/api-client';

function getPreviousAccessToken(documentId: string, publicDocumentAccessToken: string): string | null {
  const currentAccessToken = TokenManager.getAccessToken();
  const storedPreviousAccessToken = TokenManager.getPublicDocumentPreviousAccessToken(documentId);
  return (
    storedPreviousAccessToken
    || (currentAccessToken && currentAccessToken !== publicDocumentAccessToken
      ? currentAccessToken
      : null)
  );
}

function activatePublicDocumentToken(
  documentId: string,
  previousAccessTokenRef?: MutableRefObject<string | null | undefined>
): boolean {
  const publicDocumentAccessToken = TokenManager.getPublicDocumentAccessToken(documentId);
  if (!publicDocumentAccessToken) return true;

  const currentAccessToken = TokenManager.getAccessToken();
  if (previousAccessTokenRef && previousAccessTokenRef.current === undefined) {
    previousAccessTokenRef.current = getPreviousAccessToken(documentId, publicDocumentAccessToken);
  }

  if (currentAccessToken !== publicDocumentAccessToken) {
    TokenManager.setAccessToken(publicDocumentAccessToken);
  }

  return TokenManager.getAccessToken() === publicDocumentAccessToken;
}

export function usePublicDocumentToken(documentId: string): boolean {
  const previousAccessTokenRef = useRef<string | null | undefined>(undefined);
  const [isReady, setIsReady] = useState(() =>
    activatePublicDocumentToken(documentId, previousAccessTokenRef)
  );

  useLayoutEffect(() => {
    const publicDocumentAccessToken = TokenManager.getPublicDocumentAccessToken(documentId);
    if (!publicDocumentAccessToken) {
      setIsReady(true);
      return undefined;
    }

    setIsReady(false);

    const currentAccessToken = TokenManager.getAccessToken();
    if (previousAccessTokenRef.current === undefined) {
      previousAccessTokenRef.current = getPreviousAccessToken(documentId, publicDocumentAccessToken);
    }

    if (currentAccessToken !== publicDocumentAccessToken) {
      TokenManager.setAccessToken(publicDocumentAccessToken);
    }

    setIsReady(TokenManager.getAccessToken() === publicDocumentAccessToken);

    return () => {
      if (TokenManager.getAccessToken() !== publicDocumentAccessToken) {
        TokenManager.clearPublicDocumentPreviousAccessToken(documentId);
        previousAccessTokenRef.current = undefined;
        return;
      }

      const tokenToRestore = previousAccessTokenRef.current;
      if (tokenToRestore) {
        TokenManager.setAccessToken(tokenToRestore);
      }

      TokenManager.clearPublicDocumentPreviousAccessToken(documentId);
      previousAccessTokenRef.current = undefined;
    };
  }, [documentId]);

  const publicDocumentAccessToken = TokenManager.getPublicDocumentAccessToken(documentId);
  const isActiveTokenReady =
    !publicDocumentAccessToken || TokenManager.getAccessToken() === publicDocumentAccessToken;

  return isReady && isActiveTokenReady;
}
