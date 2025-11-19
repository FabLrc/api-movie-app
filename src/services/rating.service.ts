import { ratingRepository } from '../repositories/rating.repository';
import { movieRepository } from '../repositories/movie.repository';
import { redis } from '../lib/redis';

export class RatingService {
  /**
   * Create or update a rating and recalculate movie average
   */
  async upsertRating(userId: string, movieId: string, rating: number) {
    // Validate rating value
    if (rating < 1 || rating > 10) {
      throw new Error('Rating must be between 1 and 10');
    }

    // Check if movie exists
    const movie = await movieRepository.findById(movieId);
    if (!movie) {
      throw new Error('Movie not found');
    }

    // Upsert the rating
    const userRating = await ratingRepository.upsertRating(
      userId,
      movieId,
      rating,
    );

    // Recalculate movie's average rating
    await this.updateMovieAverageRating(movieId);

    // Invalidate caches
    await Promise.all([
      redis.del(`movie:${movieId}`),
      redis.del(`ratings:user:${userId}`),
      redis.del(`ratings:movie:${movieId}`),
    ]);

    return userRating;
  }

  /**
   * Get a user's rating for a movie
   */
  async getRating(userId: string, movieId: string) {
    return ratingRepository.getRating(userId, movieId);
  }

  /**
   * Delete a rating and recalculate movie average
   */
  async deleteRating(userId: string, movieId: string) {
    // Check if rating exists
    const rating = await ratingRepository.getRating(userId, movieId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    await ratingRepository.deleteRating(userId, movieId);

    // Recalculate movie's average rating
    await this.updateMovieAverageRating(movieId);

    // Invalidate caches
    await Promise.all([
      redis.del(`movie:${movieId}`),
      redis.del(`ratings:user:${userId}`),
      redis.del(`ratings:movie:${movieId}`),
    ]);
  }

  /**
   * Get all ratings for a movie
   */
  async getMovieRatings(movieId: string) {
    // Try to get from cache
    const cached = await redis.get(`ratings:movie:${movieId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const ratings = await ratingRepository.getMovieRatings(movieId);

    // Cache for 5 minutes
    await redis.setex(`ratings:movie:${movieId}`, 300, JSON.stringify(ratings));

    return ratings;
  }

  /**
   * Get all ratings by a user
   */
  async getUserRatings(userId: string, page: number = 1, limit: number = 20) {
    // Try to get from cache (only for first page)
    if (page === 1) {
      const cached = await redis.get(`ratings:user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await ratingRepository.getUserRatings(userId, page, limit);

    // Cache first page
    if (page === 1) {
      await redis.setex(`ratings:user:${userId}`, 300, JSON.stringify(result));
    }

    return result;
  }

  /**
   * Update movie's average rating and rating count
   */
  private async updateMovieAverageRating(movieId: string) {
    const { averageRating, ratingCount } =
      await ratingRepository.calculateMovieAverageRating(movieId);

    await movieRepository.updateMovieRating(
      movieId,
      averageRating,
      ratingCount,
    );
  }
}

export const ratingService = new RatingService();
