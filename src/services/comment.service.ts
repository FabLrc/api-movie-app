import { commentRepository } from '../repositories/comment.repository';
import { movieRepository } from '../repositories/movie.repository';
import { cacheService, CacheService } from './cache.service';

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

    // Invalidate movie-related caches
    await cacheService.invalidateMovie(movieId);

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
    await cacheService.invalidateMovie(comment.movieId);

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
    await cacheService.invalidateMovie(comment.movieId);
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
    const cacheKey = `comments:movie:${movieId}:page:${page}`;
    if (page === 1) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await commentRepository.getMovieComments(
      movieId,
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
   * Get all comments by a user
   */
  async getUserComments(userId: string, page: number = 1, limit: number = 20) {
    // Try to get from cache (only for first page)
    const cacheKey = `comments:user:${userId}:page:${page}`;
    if (page === 1) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await commentRepository.getUserComments(userId, page, limit);

    // Cache first page
    if (page === 1) {
      await cacheService.set(cacheKey, result, CacheService.TTL.MEDIUM);
    }

    return result;
  }
}

export const commentService = new CommentService();
