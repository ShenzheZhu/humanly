import { TokenManager } from '@/lib/api-client';

describe('TokenManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getAccessToken', () => {
    it('returns null when nothing is stored', () => {
      expect(TokenManager.getAccessToken()).toBeNull();
    });

    it('returns stored token', () => {
      localStorage.setItem('accessToken', 'abc');
      expect(TokenManager.getAccessToken()).toBe('abc');
    });
  });

  describe('setAccessToken', () => {
    it('persists the token in localStorage', () => {
      TokenManager.setAccessToken('tok-123');
      expect(localStorage.getItem('accessToken')).toBe('tok-123');
    });
  });

  describe('getRefreshToken', () => {
    it('returns null when nothing is stored', () => {
      expect(TokenManager.getRefreshToken()).toBeNull();
    });

    it('returns stored refresh token', () => {
      localStorage.setItem('refreshToken', 'refresh-abc');
      expect(TokenManager.getRefreshToken()).toBe('refresh-abc');
    });
  });

  describe('setRefreshToken', () => {
    it('persists the refresh token', () => {
      TokenManager.setRefreshToken('ref-xyz');
      expect(localStorage.getItem('refreshToken')).toBe('ref-xyz');
    });
  });

  describe('clearTokens', () => {
    it('removes both tokens from localStorage', () => {
      TokenManager.setAccessToken('a');
      TokenManager.setRefreshToken('b');
      TokenManager.clearTokens();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });
});
