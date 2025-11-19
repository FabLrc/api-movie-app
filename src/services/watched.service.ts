import { watchedRepository } from '../repositories/watched.repository';
import { movieRepository } from '../repositories/movie.repository';
import { cacheService, CacheService } from './cache.service';

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
    await cacheService.invalidateUser(userId);

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
    await cacheService.invalidateUser(userId);
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
    const cacheKey = `${CacheService.PREFIXES.WATCHED}user:${userId}:page:${page}`;
    if (page === 1) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await watchedRepository.getUserWatchedMovies(
      userId,
      page,
      limit,
    );

    // Cache first page
    if (page === 1) {
      await cacheService.set(cacheKey, result, CacheService.TTL.MEDIUM);
    }

    return result;
  }

  /**
   * Get user's watch statistics
   */
  async getUserWatchedStats(userId: string) {
    const cacheKey = `${CacheService.PREFIXES.WATCHED}stats:${userId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await watchedRepository.getUserWatchedStats(userId);

    // Cache for 10 minutes
    await cacheService.set(cacheKey, stats, CacheService.TTL.MEDIUM * 2);

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
