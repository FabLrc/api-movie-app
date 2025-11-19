import { redis } from '../lib/redis.js';

/**
 * Cache Service - Centralized cache management with Redis
 * Provides utilities for cache operations, invalidations, and patterns
 */
export class CacheService {
  /**
   * Cache prefixes for different entities
   */
  static readonly PREFIXES = {
    MOVIE: 'movie:',
    MOVIES_LIST: 'movies:list:',
    SEARCH: 'search:',
    USER: 'user:',
    COMMENTS: 'comments:',
    RATINGS: 'ratings:',
    FAVORITES: 'favorites:',
    WATCHED: 'watched:',
    RATE_LIMIT: 'ratelimit:',
  };

  /**
   * Default TTL values (in seconds)
   */
  static readonly TTL = {
    SHORT: 60, // 1 minute - for frequently changing data
    MEDIUM: 300, // 5 minutes - for relatively stable data
    LONG: 3600, // 1 hour - for rarely changing data
    DAY: 86400, // 24 hours - for very stable data
  };

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) return null;
      return JSON.parse(cached) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(
    key: string,
    value: unknown,
    ttl: number = CacheService.TTL.MEDIUM,
  ): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await redis.del(...keys);
    } catch (error) {
      console.error(`Cache deleteMany error:`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   * WARNING: Use with caution in production with large datasets
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      console.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all movie-related caches
   */
  async invalidateMovie(movieId: string): Promise<void> {
    await Promise.all([
      this.delete(`${CacheService.PREFIXES.MOVIE}${movieId}`),
      this.deletePattern(`${CacheService.PREFIXES.MOVIES_LIST}*`),
      this.deletePattern(`${CacheService.PREFIXES.SEARCH}*`),
      this.deletePattern(`${CacheService.PREFIXES.COMMENTS}movie:${movieId}*`),
      this.deletePattern(`${CacheService.PREFIXES.RATINGS}movie:${movieId}*`),
    ]);
  }

  /**
   * Invalidate all search-related caches
   */
  async invalidateSearches(): Promise<void> {
    await this.deletePattern(`${CacheService.PREFIXES.SEARCH}*`);
  }

  /**
   * Invalidate all list caches (movies lists, paginated results)
   */
  async invalidateLists(): Promise<void> {
    await this.deletePattern(`${CacheService.PREFIXES.MOVIES_LIST}*`);
  }

  /**
   * Invalidate user-specific caches
   */
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.delete(`${CacheService.PREFIXES.USER}${userId}`),
      this.deletePattern(`${CacheService.PREFIXES.FAVORITES}user:${userId}*`),
      this.deletePattern(`${CacheService.PREFIXES.WATCHED}user:${userId}*`),
      this.deletePattern(`${CacheService.PREFIXES.RATINGS}user:${userId}*`),
      this.deletePattern(`${CacheService.PREFIXES.COMMENTS}user:${userId}*`),
    ]);
  }

  /**
   * Flush all cache (use with extreme caution!)
   */
  async flushAll(): Promise<void> {
    try {
      await redis.flushdb();
      console.warn('All cache has been flushed!');
    } catch (error) {
      console.error('Cache flush error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    dbSize: number;
    usedMemory: string;
    usedMemoryHuman: string;
    connectedClients: number;
    totalCommandsProcessed: number;
    hitRate?: number;
  }> {
    try {
      const info = await redis.info('stats');
      const memory = await redis.info('memory');
      const clients = await redis.info('clients');

      // Parse INFO responses
      const parseInfo = (infoString: string): Record<string, string> => {
        const lines = infoString.split('\r\n');
        const result: Record<string, string> = {};
        for (const line of lines) {
          if (line && !line.startsWith('#')) {
            const [key, value] = line.split(':');
            if (key && value) {
              result[key] = value;
            }
          }
        }
        return result;
      };

      const statsData = parseInfo(info);
      const memoryData = parseInfo(memory);
      const clientsData = parseInfo(clients);

      const keyspaceHits = parseInt(statsData.keyspace_hits || '0');
      const keyspaceMisses = parseInt(statsData.keyspace_misses || '0');
      const totalOps = keyspaceHits + keyspaceMisses;
      const hitRate =
        totalOps > 0 ? (keyspaceHits / totalOps) * 100 : undefined;

      return {
        dbSize: await redis.dbsize(),
        usedMemory: memoryData.used_memory || '0',
        usedMemoryHuman: memoryData.used_memory_human || '0',
        connectedClients: parseInt(clientsData.connected_clients || '0'),
        totalCommandsProcessed: parseInt(
          statsData.total_commands_processed || '0',
        ),
        hitRate,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern (limited to 1000 keys)
   */
  async getKeysByPattern(pattern: string, limit = 1000): Promise<string[]> {
    try {
      let cursor = '0';
      const keys: string[] = [];

      do {
        const [nextCursor, foundKeys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        cursor = nextCursor;
        keys.push(...foundKeys);

        if (keys.length >= limit) {
          break;
        }
      } while (cursor !== '0');

      return keys.slice(0, limit);
    } catch (error) {
      console.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Generate a cache key from parameters
   */
  generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key];
          return acc;
        },
        {} as Record<string, unknown>,
      );

    return `${prefix}${JSON.stringify(sortedParams)}`;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
