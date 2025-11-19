import { favoriteRepository } from '../repositories/favorite.repository';
import { movieRepository } from '../repositories/movie.repository';
import { redis } from '../lib/redis';

export class FavoriteService {
  /**
   * Add a movie to favorites
   */
  async addFavorite(userId: string, movieId: string) {
    // Check if movie exists
    const movie = await movieRepository.findById(movieId);
    if (!movie) {
      throw new Error('Movie not found');
    }

    // Check if already favorited
    const isFavorite = await favoriteRepository.isFavorite(userId, movieId);
    if (isFavorite) {
      throw new Error('Movie is already in favorites');
    }

    // Add to favorites
    const favorite = await favoriteRepository.addFavorite(userId, movieId);

    // Invalidate user favorites cache
    await redis.del(`favorites:user:${userId}`);

    return favorite;
  }

  /**
   * Remove a movie from favorites
   */
  async removeFavorite(userId: string, movieId: string) {
    // Check if it's in favorites
    const isFavorite = await favoriteRepository.isFavorite(userId, movieId);
    if (!isFavorite) {
      throw new Error('Movie is not in favorites');
    }

    await favoriteRepository.removeFavorite(userId, movieId);

    // Invalidate user favorites cache
    await redis.del(`favorites:user:${userId}`);
  }

  /**
   * Check if a movie is in user's favorites
   */
  async isFavorite(userId: string, movieId: string): Promise<boolean> {
    return favoriteRepository.isFavorite(userId, movieId);
  }

  /**
   * Get user's favorite movies
   */
  async getUserFavorites(userId: string, page: number = 1, limit: number = 20) {
    // Try to get from cache (only for first page to keep it simple)
    if (page === 1) {
      const cached = await redis.get(`favorites:user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await favoriteRepository.getUserFavorites(
      userId,
      page,
      limit,
    );

    // Cache first page
    if (page === 1) {
      await redis.setex(
        `favorites:user:${userId}`,
        300, // 5 minutes
        JSON.stringify(result),
      );
    }

    return result;
  }
}

export const favoriteService = new FavoriteService();
