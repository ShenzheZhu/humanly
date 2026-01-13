import rateLimit, { Options } from 'express-rate-limit';
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

/**
 * Create a rate limiter with custom options
 */
export function createRateLimiter(options: Partial<Options> = {}) {
  const defaultOptions: Partial<Options> = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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

  // Use Redis store if available and enabled, otherwise fall back to memory store
  const rateLimitOptions: Partial<Options> = {
    ...defaultOptions,
    ...options,
  };

  if (env.rateLimitEnabled && redisClient) {
    rateLimitOptions.store = new RedisStore({
      // @ts-expect-error - Type mismatch with redis client
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:',
    });
  }

  return rateLimit(rateLimitOptions);
}

/**
 * General API rate limiter
 * 1000 requests per 15 minutes
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

/**
 * Strict rate limiter for authentication endpoints
 * 100 requests per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Registration rate limiter
 * 100 registration attempts per hour per IP
 */
export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many registration attempts, please try again later',
});

/**
 * Login rate limiter
 * 100 login attempts per 15 minutes per IP
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
});

/**
 * Password reset rate limiter
 * 100 password reset requests per hour per IP
 */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many password reset attempts, please try again later',
});

/**
 * Email verification rate limiter
 * 100 email verification attempts per hour per IP
 */
export const emailVerificationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many email verification attempts, please try again later',
});

/**
 * Token refresh rate limiter
 * 100 refresh requests per 15 minutes per IP
 */
export const refreshTokenRateLimiter = createRateLimiter({
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
