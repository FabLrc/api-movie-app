import { prisma } from '../lib/prisma';
import { Favorite } from '@prisma/client';

export class FavoriteRepository {
  /**
   * Add a movie to user's favorites
   */
  async addFavorite(userId: string, movieId: string): Promise<Favorite> {
    return prisma.favorite.create({
      data: {
        userId,
        movieId,
      },
    });
  }

  /**
   * Remove a movie from user's favorites
   */
  async removeFavorite(userId: string, movieId: string): Promise<void> {
    await prisma.favorite.delete({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
  }

  /**
   * Check if a movie is in user's favorites
   */
  async isFavorite(userId: string, movieId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
    return favorite !== null;
  }

  /**
   * Get all user's favorite movies with pagination
   */
  async getUserFavorites(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
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
      prisma.favorite.count({
        where: { userId },
      }),
    ]);

    return {
      data: favorites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all users who favorited a movie
   */
  async getMovieFavorites(movieId: string) {
    return prisma.favorite.findMany({
      where: { movieId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }
}

export const favoriteRepository = new FavoriteRepository();
