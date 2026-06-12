import rateLimit, { Options } from 'express-rate-limit';
import { RequestHandler } from 'express';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Redis client for rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

// Initialize Redis client for rate limiting
async function initRedisClient() {
  if (!env.rateLimitEnabled) {
    return null;
  }

  try {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on('error', (err) => {
      logger.error('Redis rate limit client error', { error: err });
    });
    await redisClient.connect();
    logger.info('Redis rate limit client connected');
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect Redis for rate limiting', { error });
    return null;
  }
}

// Initialize Redis client
initRedisClient().catch((error) => {
  logger.error('Failed to initialize Redis client', { error });
});

function redisIsReady(): boolean {
  return Boolean(env.rateLimitEnabled && redisClient && redisClient.isReady);
}

/**
 * Create a rate limiter with custom options.
 *
 * The underlying express-rate-limit instance binds its store once, at
 * construction. Because the Redis client connects asynchronously at startup,
 * building the limiter eagerly at import time would always capture the
 * not-yet-connected client and silently fall back to the per-process memory
 * store for the lifetime of the process (ineffective across instances). To
 * avoid that, construction is deferred to the first request and the limiter is
 * rebuilt once Redis becomes ready so the shared store is actually used.
 */
export function createRateLimiter(options: Partial<Options> = {}): RequestHandler {
  const defaultOptions: Partial<Options> = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { creationStack: false },
    message: 'Too many requests, please try again later',
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Too many requests, please try again later',
      });
    },
  };

  const baseOptions: Partial<Options> = {
    ...defaultOptions,
    ...options,
  };

  let limiter: RequestHandler | null = null;
  let limiterUsesRedis = false;

  return (req, res, next) => {
    // Build on first use, then rebuild once Redis is ready so we stop relying
    // on the memory store as soon as the shared store becomes available.
    if (!limiter || (!limiterUsesRedis && redisIsReady())) {
      const limiterOptions: Partial<Options> = { ...baseOptions };

      if (redisIsReady()) {
        limiterOptions.store = new RedisStore({
          sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
          prefix: 'rl:',
        });
        limiterUsesRedis = true;
      }

      limiter = rateLimit(limiterOptions);
    }

    return limiter(req, res, next);
  };
}

/**
 * General API rate limiter
 * 1000 requests per 15 minutes
 */
export const generalRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

/**
 * Strict rate limiter for authentication endpoints
 * 100 requests per 15 minutes per IP
 */
export const authRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Registration rate limiter
 * 100 registration attempts per hour per IP
 */
export const registerRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many registration attempts, please try again later',
});

/**
 * Login rate limiter
 * 100 login attempts per 15 minutes per IP
 */
export const loginRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
});

/**
 * Password reset rate limiter
 * 100 password reset requests per hour per IP
 */
export const passwordResetRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many password reset attempts, please try again later',
});

/**
 * Email verification rate limiter
 * 100 email verification attempts per hour per IP
 */
export const emailVerificationRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many email verification attempts, please try again later',
});

/**
 * Token refresh rate limiter
 * 100 refresh requests per 15 minutes per IP
 */
export const refreshTokenRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many token refresh attempts, please try again later',
});

// Cleanup on process exit
process.on('SIGTERM', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});

process.on('SIGINT', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});
