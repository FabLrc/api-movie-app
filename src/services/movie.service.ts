import { movieRepository } from '../repositories/movie.repository.js';
import type { Movie } from '@prisma/client';
import type {
  CreateMovieInput,
  UpdateMovieInput,
  MovieQueryParams,
} from '../schemas/movie.schema.js';
import type { PaginatedResult } from '../repositories/movie.repository.js';
import {
  meiliClient,
  MOVIES_INDEX,
  transformMovieToSearchDocument,
} from '../lib/meilisearch.js';
import { cacheService, CacheService } from './cache.service.js';

export class MovieNotFoundError extends Error {
  constructor(id: string) {
    super(`Movie with ID ${id} not found`);
    this.name = 'MovieNotFoundError';
  }
}

export class MovieService {
  /**
   * Get all movies with pagination
   */
  async getMovies(params: MovieQueryParams): Promise<PaginatedResult<Movie>> {
    const cacheKey = cacheService.generateKey(
      CacheService.PREFIXES.MOVIES_LIST,
      params,
    );
    const cached = await cacheService.get<PaginatedResult<Movie>>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await movieRepository.findAll(params);

    // Cache for 1 minute (lists change frequently)
    await cacheService.set(cacheKey, result, CacheService.TTL.SHORT);

    return result;
  }

  /**
   * Get a single movie by ID
   */
  async getMovieById(id: string): Promise<Movie> {
    const cacheKey = `${CacheService.PREFIXES.MOVIE}${id}`;
    const cached = await cacheService.get<Movie>(cacheKey);

    if (cached) {
      return cached;
    }

    const movie = await movieRepository.findById(id);

    if (!movie) {
      throw new MovieNotFoundError(id);
    }

    // Cache for 5 minutes
    await cacheService.set(cacheKey, movie, CacheService.TTL.MEDIUM);

    return movie;
  }

  /**
   * Create a new movie
   */
  async createMovie(data: CreateMovieInput): Promise<Movie> {
    const movie = await movieRepository.create(data);

    // Invalidate all lists and search caches
    await Promise.all([
      cacheService.invalidateLists(),
      cacheService.invalidateSearches(),
    ]);

    // Synchronize with Meilisearch (async, don't block response)
    this.syncMovieToMeilisearch(movie).catch((error: unknown) => {
      console.error('Failed to sync movie to Meilisearch:', error);
    });

    return movie;
  }

  /**
   * Update an existing movie
   */
  async updateMovie(id: string, data: UpdateMovieInput): Promise<Movie> {
    // Check if movie exists
    const exists = await movieRepository.exists(id);
    if (!exists) {
      throw new MovieNotFoundError(id);
    }

    const movie = await movieRepository.update(id, data);

    // Invalidate all movie-related caches
    await cacheService.invalidateMovie(id);

    // Synchronize with Meilisearch (async, don't block response)
    this.syncMovieToMeilisearch(movie).catch((error: unknown) => {
      console.error('Failed to sync movie to Meilisearch:', error);
    });

    return movie;
  }

  /**
   * Delete a movie
   */
  async deleteMovie(id: string): Promise<void> {
    // Check if movie exists
    const exists = await movieRepository.exists(id);
    if (!exists) {
      throw new MovieNotFoundError(id);
    }

    await movieRepository.delete(id);

    // Invalidate all movie-related caches
    await cacheService.invalidateMovie(id);

    // Remove from Meilisearch (async, don't block response)
    this.removeMovieFromMeilisearch(id).catch((error: unknown) => {
      console.error('Failed to remove movie from Meilisearch:', error);
    });
  }

  /**
   * Synchronize a movie to Meilisearch
   */
  private async syncMovieToMeilisearch(movie: Movie): Promise<void> {
    const index = meiliClient.index(MOVIES_INDEX);
    const document = transformMovieToSearchDocument(movie);
    await index.addDocuments([document]);
  }

  /**
   * Remove a movie from Meilisearch
   */
  private async removeMovieFromMeilisearch(id: string): Promise<void> {
    const index = meiliClient.index(MOVIES_INDEX);
    await index.deleteDocument(id);
  }
}

// Export singleton instance
export const movieService = new MovieService();
