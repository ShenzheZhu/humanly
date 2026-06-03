import type { User } from '@/stores/auth-store';

export function getUserDisplayLabel(user?: Pick<User, 'email' | 'name' | 'firstName' | 'lastName'> | null) {
  if (!user) {
    return 'Account';
  }

  const fullName = [user.firstName?.trim(), user.lastName?.trim()]
    .filter(Boolean)
    .join(' ');

  return fullName || user.name?.trim() || user.email || 'Account';
}
