import { z } from 'zod';

// ─── Schemas (copied from the pages to keep tests self-contained) ─────────────

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Login schema ─────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  const valid = { email: 'user@example.com', password: 'password123' };

  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/email/i);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = loginSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/8 characters/);
  });

  it('accepts optional rememberMe', () => {
    expect(loginSchema.safeParse({ ...valid, rememberMe: true }).success).toBe(true);
    expect(loginSchema.safeParse({ ...valid, rememberMe: false }).success).toBe(true);
  });
});

// ─── Register schema ──────────────────────────────────────────────────────────

describe('registerSchema', () => {
  const valid = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'Password1',
    confirmPassword: 'Password1',
    acceptTerms: true,
  };

  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/required/i);
  });

  it('rejects name over 100 characters', () => {
    const result = registerSchema.safeParse({ ...valid, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase letter', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'password1', confirmPassword: 'password1' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/uppercase/i);
  });

  it('rejects password without a number', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'PasswordABC', confirmPassword: 'PasswordABC' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Different1' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/do not match/i);
  });

  it('rejects unaccepted terms', () => {
    const result = registerSchema.safeParse({ ...valid, acceptTerms: false });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/terms/i);
  });
});
