import { cn, formatDate, formatRelativeTime, debounce } from '@/lib/utils';

// ─── cn ───────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional objects', () => {
    expect(cn({ hidden: true, block: false })).toBe('hidden');
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a Date object', () => {
    const result = formatDate(new Date('2024-06-15T00:00:00Z'));
    expect(result).toMatch(/June|Jun/);
    expect(result).toMatch(/2024/);
  });

  it('accepts an ISO string', () => {
    const result = formatDate('2024-06-15T12:00:00Z');
    expect(result).toMatch(/2024/);
  });
});

// ─── formatRelativeTime ───────────────────────────────────────────────────────

describe('formatRelativeTime', () => {
  const now = new Date();

  it('returns "just now" for recent timestamps', () => {
    const recent = new Date(now.getTime() - 10_000); // 10s ago
    expect(formatRelativeTime(recent)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const d = new Date(now.getTime() - 5 * 60_000);
    expect(formatRelativeTime(d)).toBe('5 minutes ago');
  });

  it('returns singular "minute ago"', () => {
    const d = new Date(now.getTime() - 60_000);
    expect(formatRelativeTime(d)).toBe('1 minute ago');
  });

  it('returns hours ago', () => {
    const d = new Date(now.getTime() - 3 * 3_600_000);
    expect(formatRelativeTime(d)).toBe('3 hours ago');
  });

  it('returns days ago', () => {
    const d = new Date(now.getTime() - 2 * 86_400_000);
    expect(formatRelativeTime(d)).toBe('2 days ago');
  });

  it('accepts an ISO string', () => {
    const d = new Date(now.getTime() - 60_000).toISOString();
    expect(formatRelativeTime(d)).toBe('1 minute ago');
  });
});

// ─── debounce ─────────────────────────────────────────────────────────────────

describe('debounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not call the function before the wait', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced();
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls the function after the wait', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced();
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on repeated calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced();
    jest.advanceTimersByTime(200);
    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the latest arguments', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    debounced('b');
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('b');
  });
});
