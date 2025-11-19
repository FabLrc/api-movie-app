import { commentRepository } from '../repositories/comment.repository';
import { movieRepository } from '../repositories/movie.repository';
import { redis } from '../lib/redis';

export class CommentService {
  /**
   * Create a new comment
   */
  async createComment(userId: string, movieId: string, content: string) {
    // Check if movie exists
    const movie = await movieRepository.findById(movieId);
    if (!movie) {
      throw new Error('Movie not found');
    }

    const comment = await commentRepository.createComment(
      userId,
      movieId,
      content,
    );

    // Invalidate movie comments cache
    await redis.del(`comments:movie:${movieId}`);
    await redis.del(`movie:${movieId}`);

    return comment;
  }

  /**
   * Get a comment by ID
   */
  async getCommentById(id: string) {
    const comment = await commentRepository.getCommentById(id);
    if (!comment) {
      throw new Error('Comment not found');
    }
    return comment;
  }

  /**
   * Update a comment
   */
  async updateComment(id: string, userId: string, content: string) {
    const comment = await commentRepository.getCommentById(id);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check ownership
    if (comment.userId !== userId) {
      throw new Error('You can only update your own comments');
    }

    const updatedComment = await commentRepository.updateComment(id, content);

    // Invalidate caches
    await Promise.all([
      redis.del(`comments:movie:${comment.movieId}`),
      redis.del(`comments:user:${userId}`),
      redis.del(`movie:${comment.movieId}`),
    ]);

    return updatedComment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(id: string, userId: string, isAdmin: boolean = false) {
    const comment = await commentRepository.getCommentById(id);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check ownership or admin
    if (comment.userId !== userId && !isAdmin) {
      throw new Error('You can only delete your own comments');
    }

    await commentRepository.deleteComment(id);

    // Invalidate caches
    await Promise.all([
      redis.del(`comments:movie:${comment.movieId}`),
      redis.del(`comments:user:${comment.userId}`),
      redis.del(`movie:${comment.movieId}`),
    ]);
  }

  /**
   * Get all comments for a movie
   */
  async getMovieComments(
    movieId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Try to get from cache (only for first page)
    if (page === 1) {
      const cached = await redis.get(`comments:movie:${movieId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await commentRepository.getMovieComments(
      movieId,
      page,
      limit,
    );

    // Cache first page
    if (page === 1) {
      await redis.setex(
        `comments:movie:${movieId}`,
        300, // 5 minutes
        JSON.stringify(result),
      );
    }

    return result;
  }

  /**
   * Get all comments by a user
   */
  async getUserComments(userId: string, page: number = 1, limit: number = 20) {
    // Try to get from cache (only for first page)
    if (page === 1) {
      const cached = await redis.get(`comments:user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await commentRepository.getUserComments(userId, page, limit);

    // Cache first page
    if (page === 1) {
      await redis.setex(`comments:user:${userId}`, 300, JSON.stringify(result));
    }

    return result;
  }
}

export const commentService = new CommentService();
