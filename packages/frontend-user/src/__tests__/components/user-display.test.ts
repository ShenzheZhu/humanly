import { getUserDisplayLabel, isGuestUserEmail } from '@/components/navigation/user-display';

describe('user display label', () => {
  it('prefers first and last name over legacy name and email', () => {
    expect(getUserDisplayLabel({
      email: 'writer@example.com',
      name: 'Legacy Writer',
      firstName: 'First',
      lastName: 'Last',
    })).toBe('First Last');
  });

  it('falls back to legacy name, then email, and masks guest emails', () => {
    expect(getUserDisplayLabel({
      email: 'writer@example.com',
      name: 'Legacy Writer',
    })).toBe('Legacy Writer');
    expect(getUserDisplayLabel({ email: 'writer@example.com' })).toBe('writer@example.com');
    expect(isGuestUserEmail('public@guest.humanly.local')).toBe(true);
    expect(getUserDisplayLabel({ email: 'public@guest.humanly.local' })).toBe('guest');
  });
});
