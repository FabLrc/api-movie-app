import { prisma } from '../lib/prisma';
import { Comment } from '@prisma/client';

export class CommentRepository {
  /**
   * Create a new comment
   */
  async createComment(
    userId: string,
    movieId: string,
    content: string,
  ): Promise<Comment> {
    return prisma.comment.create({
      data: {
        userId,
        movieId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get a comment by ID
   */
  async getCommentById(id: string): Promise<Comment | null> {
    return prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Update a comment
   */
  async updateComment(id: string, content: string): Promise<Comment> {
    return prisma.comment.update({
      where: { id },
      data: {
        content,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(id: string): Promise<void> {
    await prisma.comment.delete({
      where: { id },
    });
  }

  /**
   * Get all comments for a movie with pagination
   */
  async getMovieComments(
    movieId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { movieId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.comment.count({
        where: { movieId },
      }),
    ]);

    return {
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all comments by a user with pagination
   */
  async getUserComments(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { userId },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              poster: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.comment.count({
        where: { userId },
      }),
    ]);

    return {
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const commentRepository = new CommentRepository();
