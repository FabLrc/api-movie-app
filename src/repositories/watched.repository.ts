import { prisma } from '../lib/prisma';
import { Watched } from '@prisma/client';

export class WatchedRepository {
  /**
   * Mark a movie as watched
   */
  async markAsWatched(userId: string, movieId: string): Promise<Watched> {
    return prisma.watched.create({
      data: {
        userId,
        movieId,
      },
    });
  }

  /**
   * Unmark a movie as watched
   */
  async unmarkAsWatched(userId: string, movieId: string): Promise<void> {
    await prisma.watched.delete({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
  }

  /**
   * Check if a movie is watched by user
   */
  async isWatched(userId: string, movieId: string): Promise<boolean> {
    const watched = await prisma.watched.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
    return watched !== null;
  }

  /**
   * Get all watched movies for a user with pagination
   */
  async getUserWatchedMovies(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [watched, total] = await Promise.all([
      prisma.watched.findMany({
        where: { userId },
        include: {
          movie: true,
        },
        skip,
        take: limit,
        orderBy: {
          watchedAt: 'desc',
        },
      }),
      prisma.watched.count({
        where: { userId },
      }),
    ]);

    return {
      data: watched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get watch statistics for a user
   */
  async getUserWatchedStats(userId: string) {
    const totalWatched = await prisma.watched.count({
      where: { userId },
    });

    return {
      totalWatched,
    };
  }

  /**
   * Get recently watched movies for a user
   */
  async getRecentlyWatched(userId: string, limit: number = 10) {
    return prisma.watched.findMany({
      where: { userId },
      include: {
        movie: true,
      },
      take: limit,
      orderBy: {
        watchedAt: 'desc',
      },
    });
  }
}

export const watchedRepository = new WatchedRepository();
