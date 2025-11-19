import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { cacheService } from '../services/cache.service.js';

const cacheStatsResponseSchema = z.object({
  dbSize: z.number().describe('Number of keys in Redis'),
  usedMemory: z.string().describe('Memory used by Redis (bytes)'),
  usedMemoryHuman: z.string().describe('Memory used by Redis (human readable)'),
  connectedClients: z.number().describe('Number of connected clients'),
  totalCommandsProcessed: z
    .number()
    .describe('Total commands processed by Redis'),
  hitRate: z.number().optional().describe('Cache hit rate percentage (0-100)'),
});

const cacheKeysResponseSchema = z.object({
  pattern: z.string(),
  keys: z.array(z.string()),
  count: z.number(),
});

const cacheDeleteResponseSchema = z.object({
  message: z.string(),
  deletedCount: z.number().optional(),
});

const patternQuerySchema = z.object({
  pattern: z.string().describe('Redis key pattern (e.g., "movie:*")'),
  limit: z.coerce.number().min(1).max(1000).default(100).optional(),
});

/**
 * Admin routes for cache management
 * WARNING: These routes should be protected with admin authentication
 */
export async function adminRoutes(app: FastifyInstance) {
  // GET /admin/cache/stats - Get Redis statistics
  app.withTypeProvider<ZodTypeProvider>().get(
    '/admin/cache/stats',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get Redis cache statistics',
        description:
          'Returns detailed statistics about Redis cache usage, memory, and performance',
        response: {
          200: cacheStatsResponseSchema,
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      // TODO: Add admin authentication middleware
      // preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const stats = await cacheService.getStats();
        return reply.send(stats);
      } catch (error) {
        request.log.error({ error }, 'Failed to get cache stats');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve cache statistics',
        });
      }
    },
  );

  // GET /admin/cache/keys - List keys matching a pattern
  app.withTypeProvider<ZodTypeProvider>().get(
    '/admin/cache/keys',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List cache keys by pattern',
        description:
          'Returns a list of cache keys matching the specified pattern',
        querystring: patternQuerySchema,
        response: {
          200: cacheKeysResponseSchema,
          400: z.object({
            error: z.string(),
            message: z.string(),
          }),
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      // TODO: Add admin authentication middleware
      // preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const { pattern, limit } = request.query;

        if (!pattern) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Pattern parameter is required',
          });
        }

        const keys = await cacheService.getKeysByPattern(pattern, limit);

        return reply.send({
          pattern,
          keys,
          count: keys.length,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to list cache keys');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve cache keys',
        });
      }
    },
  );

  // DELETE /admin/cache - Flush all cache
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/admin/cache',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Flush all cache',
        description:
          'WARNING: Deletes ALL keys from Redis cache. Use with extreme caution!',
        response: {
          200: cacheDeleteResponseSchema,
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      // TODO: Add admin authentication middleware
      // preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        await cacheService.flushAll();
        request.log.warn('Admin flushed all cache');

        return reply.send({
          message: 'All cache has been flushed successfully',
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to flush cache');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to flush cache',
        });
      }
    },
  );

  // DELETE /admin/cache/pattern - Delete keys by pattern
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/admin/cache/pattern',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete cache keys by pattern',
        description: 'Deletes all cache keys matching the specified pattern',
        querystring: z.object({
          pattern: z.string().describe('Redis key pattern (e.g., "movie:*")'),
        }),
        response: {
          200: cacheDeleteResponseSchema,
          400: z.object({
            error: z.string(),
            message: z.string(),
          }),
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      // TODO: Add admin authentication middleware
      // preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const { pattern } = request.query;

        if (!pattern) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Pattern parameter is required',
          });
        }

        const deletedCount = await cacheService.deletePattern(pattern);
        request.log.info(
          `Admin deleted ${deletedCount} keys with pattern: ${pattern}`,
        );

        return reply.send({
          message: `Successfully deleted ${deletedCount} cache keys`,
          deletedCount,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to delete cache keys');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete cache keys',
        });
      }
    },
  );

  // DELETE /admin/cache/movie/:id - Invalidate specific movie cache
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/admin/cache/movie/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Invalidate movie cache',
        description: 'Deletes all cache entries related to a specific movie',
        params: z.object({
          id: z.string().describe('Movie ID'),
        }),
        response: {
          200: cacheDeleteResponseSchema,
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      // TODO: Add admin authentication middleware
      // preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await cacheService.invalidateMovie(id);
        request.log.info(`Admin invalidated cache for movie: ${id}`);

        return reply.send({
          message: `Successfully invalidated cache for movie ${id}`,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to invalidate movie cache');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to invalidate movie cache',
        });
      }
    },
  );

  // DELETE /admin/cache/searches - Invalidate all search caches
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/admin/cache/searches',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Invalidate search caches',
        description: 'Deletes all search-related cache entries',
        response: {
          200: cacheDeleteResponseSchema,
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      // TODO: Add admin authentication middleware
      // preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        await cacheService.invalidateSearches();
        request.log.info('Admin invalidated all search caches');

        return reply.send({
          message: 'Successfully invalidated all search caches',
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to invalidate search caches');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to invalidate search caches',
        });
      }
    },
  );

  // DELETE /admin/cache/lists - Invalidate all list caches
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/admin/cache/lists',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Invalidate list caches',
        description: 'Deletes all movie list cache entries',
        response: {
          200: cacheDeleteResponseSchema,
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      // TODO: Add admin authentication middleware
      // preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        await cacheService.invalidateLists();
        request.log.info('Admin invalidated all list caches');

        return reply.send({
          message: 'Successfully invalidated all list caches',
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to invalidate list caches');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to invalidate list caches',
        });
      }
    },
  );
}
