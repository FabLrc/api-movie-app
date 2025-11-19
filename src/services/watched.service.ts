import { watchedRepository } from '../repositories/watched.repository';
import { movieRepository } from '../repositories/movie.repository';
import { redis } from '../lib/redis';

export class WatchedService {
  /**
   * Mark a movie as watched
   */
  async markAsWatched(userId: string, movieId: string) {
    // Check if movie exists
    const movie = await movieRepository.findById(movieId);
    if (!movie) {
      throw new Error('Movie not found');
    }

    // Check if already watched
    const isWatched = await watchedRepository.isWatched(userId, movieId);
    if (isWatched) {
      throw new Error('Movie is already marked as watched');
    }

    // Mark as watched
    const watched = await watchedRepository.markAsWatched(userId, movieId);

    // Invalidate user watched cache
    await redis.del(`watched:user:${userId}`);
    await redis.del(`watched:stats:${userId}`);

    return watched;
  }

  /**
   * Unmark a movie as watched
   */
  async unmarkAsWatched(userId: string, movieId: string) {
    // Check if it's marked as watched
    const isWatched = await watchedRepository.isWatched(userId, movieId);
    if (!isWatched) {
      throw new Error('Movie is not marked as watched');
    }

    await watchedRepository.unmarkAsWatched(userId, movieId);

    // Invalidate user watched cache
    await redis.del(`watched:user:${userId}`);
    await redis.del(`watched:stats:${userId}`);
  }

  /**
   * Check if a movie is watched by user
   */
  async isWatched(userId: string, movieId: string): Promise<boolean> {
    return watchedRepository.isWatched(userId, movieId);
  }

  /**
   * Get user's watched movies
   */
  async getUserWatchedMovies(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Try to get from cache (only for first page)
    if (page === 1) {
      const cached = await redis.get(`watched:user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await watchedRepository.getUserWatchedMovies(
      userId,
      page,
      limit,
    );

    // Cache first page
    if (page === 1) {
      await redis.setex(
        `watched:user:${userId}`,
        300, // 5 minutes
        JSON.stringify(result),
      );
    }

    return result;
  }

  /**
   * Get user's watch statistics
   */
  async getUserWatchedStats(userId: string) {
    // Try to get from cache
    const cached = await redis.get(`watched:stats:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await watchedRepository.getUserWatchedStats(userId);

    // Cache for 10 minutes
    await redis.setex(`watched:stats:${userId}`, 600, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get recently watched movies
   */
  async getRecentlyWatched(userId: string, limit: number = 10) {
    return watchedRepository.getRecentlyWatched(userId, limit);
  }
}

export const watchedService = new WatchedService();
