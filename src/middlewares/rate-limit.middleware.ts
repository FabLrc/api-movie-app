import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../lib/redis.js';

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   */
  max: number;

  /**
   * Time window in seconds
   */
  timeWindow: number;

  /**
   * Key prefix for Redis
   */
  keyPrefix?: string;

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (request: FastifyRequest) => boolean | Promise<boolean>;

  /**
   * Custom key generator
   */
  keyGenerator?: (request: FastifyRequest) => string;
}

/**
 * Rate limiting middleware using Redis
 * Implements a sliding window algorithm for accurate rate limiting
 */
export function rateLimitMiddleware(options: RateLimitOptions) {
  const {
    max,
    timeWindow,
    keyPrefix = 'ratelimit',
    errorMessage = 'Too many requests, please try again later',
    skip,
    keyGenerator,
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if we should skip rate limiting
      if (skip && (await skip(request))) {
        return;
      }

      // Generate rate limit key
      let key: string;
      if (keyGenerator) {
        key = keyGenerator(request);
      } else {
        // Default: use IP address
        const ip =
          request.headers['x-forwarded-for'] ||
          request.headers['x-real-ip'] ||
          request.ip;
        key = `${keyPrefix}:${ip}:${request.routeOptions.url}`;
      }

      // Use Redis sorted sets for sliding window
      const now = Date.now();
      const windowStart = now - timeWindow * 1000;

      // Start a Redis pipeline for atomic operations
      const pipeline = redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      pipeline.expire(key, timeWindow);

      // Execute pipeline
      const results = await pipeline.exec();

      if (!results) {
        // If Redis fails, allow the request (fail open)
        request.log.warn('Rate limit check failed, allowing request');
        return;
      }

      // Get count from pipeline results (index 1 is zcard result)
      const count = (results[1][1] as number) || 0;

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', max);
      reply.header('X-RateLimit-Remaining', Math.max(0, max - count - 1));
      reply.header('X-RateLimit-Reset', now + timeWindow * 1000);

      // Check if limit exceeded
      if (count >= max) {
        const retryAfter = Math.ceil(timeWindow);
        reply.header('Retry-After', retryAfter);

        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: errorMessage,
          retryAfter,
        });
      }
    } catch (error) {
      // Log error but don't block the request (fail open)
      request.log.error({ error }, 'Rate limit middleware error');
    }
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /**
   * Strict rate limit for authentication endpoints (5 requests per minute)
   */
  auth: rateLimitMiddleware({
    max: 5,
    timeWindow: 60,
    keyPrefix: 'ratelimit:auth',
    errorMessage: 'Too many authentication attempts. Please try again later.',
  }),

  /**
   * Standard rate limit for API endpoints (100 requests per minute)
   */
  api: rateLimitMiddleware({
    max: 100,
    timeWindow: 60,
    keyPrefix: 'ratelimit:api',
  }),

  /**
   * Relaxed rate limit for search (30 requests per minute)
   */
  search: rateLimitMiddleware({
    max: 30,
    timeWindow: 60,
    keyPrefix: 'ratelimit:search',
  }),

  /**
   * Very strict for write operations (10 requests per minute)
   */
  write: rateLimitMiddleware({
    max: 10,
    timeWindow: 60,
    keyPrefix: 'ratelimit:write',
  }),
};

/**
 * Rate limiter per authenticated user
 */
export function userRateLimiter(
  options: Omit<RateLimitOptions, 'keyGenerator'>,
) {
  return rateLimitMiddleware({
    ...options,
    keyGenerator: (request: FastifyRequest) => {
      const userId = request.user?.id || 'anonymous';
      return `${options.keyPrefix || 'ratelimit'}:user:${userId}:${request.routeOptions.url}`;
    },
  });
}

/**
 * Reset rate limit for a specific key (useful for testing or admin actions)
 */
export async function resetRateLimit(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Get current rate limit status for a key
 */
export async function getRateLimitStatus(
  key: string,
  timeWindow: number,
): Promise<{
  current: number;
  resetAt: number;
}> {
  const now = Date.now();
  const windowStart = now - timeWindow * 1000;

  // Count requests in current window
  const current = await redis.zcount(key, windowStart, now);

  // Get TTL
  const ttl = await redis.ttl(key);
  const resetAt = ttl > 0 ? now + ttl * 1000 : now + timeWindow * 1000;

  return {
    current,
    resetAt,
  };
}
