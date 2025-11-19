import { prisma } from '../lib/prisma.js';
import type { Movie, Prisma } from '@prisma/client';
import type {
  CreateMovieInput,
  UpdateMovieInput,
  MovieQueryParams,
} from '../schemas/movie.schema.js';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MovieRepository {
  /**
   * Find all movies with pagination and optional sorting
   */
  async findAll(params: MovieQueryParams): Promise<PaginatedResult<Movie>> {
    const { page, limit, sortBy = 'createdAt', order = 'asc' } = params;
    const skip = (page - 1) * limit;

    // Build orderBy clause
    const orderBy: Prisma.MovieOrderByWithRelationInput = {
      [sortBy]: order,
    };

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      prisma.movie.findMany({
        skip,
        take: limit,
        orderBy,
      }),
      prisma.movie.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Find a single movie by ID
   */
  async findById(id: string): Promise<Movie | null> {
    return prisma.movie.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new movie
   */
  async create(data: CreateMovieInput): Promise<Movie> {
    return prisma.movie.create({
      data: {
        title: data.title,
        description: data.description,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
        duration: data.duration,
        genres: data.genres || [],
        director: data.director,
        cast: data.cast as Prisma.InputJsonValue,
        crew: data.crew as Prisma.InputJsonValue,
        poster: data.poster,
        backdrop: data.backdrop,
        originalLanguage: data.originalLanguage,
        budget: data.budget,
        revenue: data.revenue,
      },
    });
  }

  /**
   * Update an existing movie
   */
  async update(id: string, data: UpdateMovieInput): Promise<Movie> {
    const updateData: Prisma.MovieUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.releaseDate !== undefined)
      updateData.releaseDate = new Date(data.releaseDate);
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.genres !== undefined) updateData.genres = data.genres;
    if (data.director !== undefined) updateData.director = data.director;
    if (data.cast !== undefined)
      updateData.cast = data.cast as Prisma.InputJsonValue;
    if (data.crew !== undefined)
      updateData.crew = data.crew as Prisma.InputJsonValue;
    if (data.poster !== undefined) updateData.poster = data.poster;
    if (data.backdrop !== undefined) updateData.backdrop = data.backdrop;
    if (data.originalLanguage !== undefined)
      updateData.originalLanguage = data.originalLanguage;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.revenue !== undefined) updateData.revenue = data.revenue;

    return prisma.movie.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a movie
   */
  async delete(id: string): Promise<Movie> {
    return prisma.movie.delete({
      where: { id },
    });
  }

  /**
   * Check if a movie exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.movie.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Update movie rating statistics
   */
  async updateMovieRating(
    id: string,
    averageRating: number,
    ratingCount: number,
  ): Promise<Movie> {
    return prisma.movie.update({
      where: { id },
      data: {
        averageRating,
        ratingCount,
      },
    });
  }
}

// Export singleton instance
export const movieRepository = new MovieRepository();
