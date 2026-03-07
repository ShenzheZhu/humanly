jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  TokenManager: { getAccessToken: jest.fn(() => null), setAccessToken: jest.fn(), clearTokens: jest.fn(), getRefreshToken: jest.fn(() => null), setRefreshToken: jest.fn() },
  ApiError: class ApiError extends Error {},
  apiClient: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/lib/socket-client', () => ({ initializeSocket: jest.fn(), disconnectSocket: jest.fn() }));

import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';

beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
});

describe('useAuth', () => {
  it('exposes isAuthenticated from store', () => {
    useAuthStore.setState({ isAuthenticated: true });
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('exposes user from store', () => {
    const user = { id: '1', email: 'a@b.com', emailVerified: true, createdAt: '', updatedAt: '' };
    useAuthStore.setState({ user });
    const { result } = renderHook(() => useAuth());
    expect(result.current.user?.email).toBe('a@b.com');
  });

  it('exposes isLoading from store', () => {
    useAuthStore.setState({ isLoading: true });
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error from store', () => {
    useAuthStore.setState({ error: 'Login failed' });
    const { result } = renderHook(() => useAuth());
    expect(result.current.error).toBe('Login failed');
  });

  it('exposes all action functions', () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.forgotPassword).toBe('function');
    expect(typeof result.current.resetPassword).toBe('function');
    expect(typeof result.current.verifyEmail).toBe('function');
  });
});
