/**
 * Polyfill for crypto.randomUUID()
 * Required for non-secure contexts (HTTP) where crypto.randomUUID is not available
 */
export function polyfillCryptoRandomUUID() {
  if (typeof window !== 'undefined' && !crypto.randomUUID) {
    // Simple UUID v4 implementation
    crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}
