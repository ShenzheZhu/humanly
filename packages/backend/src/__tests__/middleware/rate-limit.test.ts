// Verifies the lazy store-selection fix: limiters must attach the shared Redis
// store once the client is ready, instead of being frozen onto the per-process
// memory store at import time (before the async Redis connection completes).

const mockRateLimit = jest.fn((opts: any) => {
  const middleware: any = (_req: any, _res: any, next: any) => next();
  middleware.__opts = opts;
  return middleware;
});

jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: (opts: any) => mockRateLimit(opts),
}));

jest.mock('rate-limit-redis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((opts: any) => ({ __isRedisStore: true, opts })),
}));

const fakeRedisClient: any = {
  isReady: false,
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  sendCommand: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('redis', () => ({
  __esModule: true,
  createClient: jest.fn(() => fakeRedisClient),
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

function loadModule() {
  process.env.RATE_LIMIT_ENABLED = 'true';
  process.env.REDIS_URL = 'redis://localhost:6379';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../middleware/rate-limit');
}

describe('createRateLimiter store selection', () => {
  beforeEach(() => {
    jest.resetModules();
    mockRateLimit.mockClear();
    fakeRedisClient.isReady = false;
  });

  it('falls back to the memory store until Redis is ready, then rebuilds with the Redis store', () => {
    const { createRateLimiter } = loadModule();
    const limiter = createRateLimiter({ max: 5 });
    const next = jest.fn();

    // First request while Redis is not ready -> memory store (no store option).
    limiter({ ip: '1.1.1.1', path: '/x' }, {}, next);
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockRateLimit.mock.calls[0][0].store).toBeUndefined();
    expect(mockRateLimit.mock.calls[0][0].validate).toEqual(
      expect.objectContaining({ creationStack: false })
    );

    // Redis becomes ready -> the next request rebuilds with the Redis store.
    fakeRedisClient.isReady = true;
    limiter({ ip: '1.1.1.1', path: '/x' }, {}, next);
    expect(mockRateLimit).toHaveBeenCalledTimes(2);
    expect(mockRateLimit.mock.calls[1][0].store).toEqual(
      expect.objectContaining({ __isRedisStore: true })
    );
    expect(mockRateLimit.mock.calls[1][0].validate).toEqual(
      expect.objectContaining({ creationStack: false })
    );

    // Once Redis-backed, the limiter is reused (no further rebuilds).
    limiter({ ip: '1.1.1.1', path: '/x' }, {}, next);
    expect(mockRateLimit).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('keeps using the memory store when rate limiting is disabled', () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRateLimiter } = require('../../middleware/rate-limit');
    const limiter = createRateLimiter({ max: 5 });
    const next = jest.fn();

    fakeRedisClient.isReady = true; // even if a client were ready, disabled => memory
    limiter({ ip: '2.2.2.2', path: '/y' }, {}, next);

    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockRateLimit.mock.calls[0][0].store).toBeUndefined();
    expect(mockRateLimit.mock.calls[0][0].validate).toEqual(
      expect.objectContaining({ creationStack: false })
    );
  });
});
