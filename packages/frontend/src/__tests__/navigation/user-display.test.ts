import { getUserDisplayLabel } from '@/components/navigation/user-display';

describe('admin display label', () => {
  it('prefers first and last name over legacy name and email', () => {
    expect(getUserDisplayLabel({
      email: 'admin@example.com',
      name: 'Legacy Admin',
      firstName: 'Admin',
      lastName: 'Owner',
    })).toBe('Admin Owner');
  });

  it('falls back to legacy name and then email', () => {
    expect(getUserDisplayLabel({
      email: 'admin@example.com',
      name: 'Legacy Admin',
    })).toBe('Legacy Admin');
    expect(getUserDisplayLabel({ email: 'admin@example.com' })).toBe('admin@example.com');
  });
});
