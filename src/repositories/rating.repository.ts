import { prisma } from '../lib/prisma';
import { Rating } from '@prisma/client';

export class RatingRepository {
  /**
   * Create or update a rating
   */
  async upsertRating(
    userId: string,
    movieId: string,
    rating: number,
  ): Promise<Rating> {
    return prisma.rating.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
      update: {
        rating,
        updatedAt: new Date(),
      },
      create: {
        userId,
        movieId,
        rating,
      },
    });
  }

  /**
   * Get a specific rating
   */
  async getRating(userId: string, movieId: string): Promise<Rating | null> {
    return prisma.rating.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
  }

  /**
   * Delete a rating
   */
  async deleteRating(userId: string, movieId: string): Promise<void> {
    await prisma.rating.delete({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
  }

  /**
   * Get all ratings for a movie
   */
  async getMovieRatings(movieId: string) {
    return prisma.rating.findMany({
      where: { movieId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all ratings by a user with pagination
   */
  async getUserRatings(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany({
        where: { userId },
        include: {
          movie: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.rating.count({
        where: { userId },
      }),
    ]);

    return {
      data: ratings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calculate average rating for a movie
   */
  async calculateMovieAverageRating(movieId: string): Promise<{
    averageRating: number;
    ratingCount: number;
  }> {
    const result = await prisma.rating.aggregate({
      where: { movieId },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    return {
      averageRating: result._avg.rating || 0,
      ratingCount: result._count.rating,
    };
  }
}

export const ratingRepository = new RatingRepository();
