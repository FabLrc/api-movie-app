import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'disconnected',
      redis: 'disconnected',
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.db = 'connected';
    } catch (error) {
      health.status = 'error';
      health.db = 'disconnected';
    }

    // Check Redis connection
    try {
      await redis.ping();
      health.redis = 'connected';
    } catch (error) {
      health.status = 'error';
      health.redis = 'disconnected';
    }

    return health;
  });
}
