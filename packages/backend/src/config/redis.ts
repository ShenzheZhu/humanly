import { createClient, RedisClientType } from 'redis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export async function createRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: env.redisUrl,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  await redisClient.connect();

  return redisClient;
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call createRedisClient first.');
  }
  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

// Cache helper functions
export async function cacheGet(key: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    logger.error('Redis GET error', { key, error });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  try {
    const client = getRedisClient();
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  } catch (error) {
    logger.error('Redis SET error', { key, error });
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    logger.error('Redis DEL error', { key, error });
  }
}

export async function cacheGetJSON<T>(key: string): Promise<T | null> {
  const value = await cacheGet(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('Redis JSON parse error', { key, error });
    return null;
  }
}

export async function cacheSetJSON<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    await cacheSet(key, JSON.stringify(value), ttlSeconds);
  } catch (error) {
    logger.error('Redis JSON stringify error', { key, error });
  }
}
