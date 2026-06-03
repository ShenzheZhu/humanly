import type { User } from '@/stores/auth-store';

const GUEST_EMAIL_DOMAIN = '@guest.humanly.local';

export function isGuestUserEmail(email?: string | null) {
  return Boolean(email?.trim().toLowerCase().endsWith(GUEST_EMAIL_DOMAIN));
}

export function getUserDisplayLabel(user?: Pick<User, 'email' | 'name' | 'firstName' | 'lastName'> | null) {
  if (!user) {
    return 'Account';
  }

  if (isGuestUserEmail(user.email)) {
    return 'guest';
  }

  const fullName = [user.firstName?.trim(), user.lastName?.trim()]
    .filter(Boolean)
    .join(' ');

  return fullName || user.name?.trim() || user.email || 'Account';
}
