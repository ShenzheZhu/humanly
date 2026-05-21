const GUEST_EMAIL_DOMAIN = '@guest.humanly.local';

export function isGuestUserEmail(email?: string | null) {
  return Boolean(email?.trim().toLowerCase().endsWith(GUEST_EMAIL_DOMAIN));
}

export function getUserDisplayLabel(email?: string | null) {
  const trimmedEmail = email?.trim();

  if (!trimmedEmail) {
    return '';
  }

  if (isGuestUserEmail(trimmedEmail)) {
    return 'guest';
  }

  return trimmedEmail;
}
