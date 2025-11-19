import { z } from 'zod';

// Schema for cast member
export const castMemberSchema = z.object({
  name: z.string(),
  character: z.string().optional(),
  order: z.number().int().optional(),
  imageUrl: z.string().url().optional(),
});

// Schema for crew member
export const crewMemberSchema = z.object({
  name: z.string(),
  job: z.string(),
  department: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

// Schema for creating a movie
export const createMovieSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  releaseDate: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  genres: z.array(z.string()).default([]),
  director: z.string().optional(),
  cast: z.array(castMemberSchema).optional(),
  crew: z.array(crewMemberSchema).optional(),
  poster: z.string().url().optional(),
  backdrop: z.string().url().optional(),
  originalLanguage: z.string().optional(),
  budget: z.number().int().nonnegative().optional(),
  revenue: z.number().int().nonnegative().optional(),
});

// Schema for updating a movie
export const updateMovieSchema = createMovieSchema.partial();

// Schema for movie query parameters (pagination)
export const movieQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(['title', 'releaseDate', 'averageRating', 'createdAt'])
    .optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// Schema for movie ID parameter
export const movieIdParamSchema = z.object({
  id: z.string().uuid('Invalid movie ID format'),
});

// Schema for movie response
export const movieResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  releaseDate: z.union([z.string(), z.date()]).nullable(),
  duration: z.number().int().nullable(),
  genres: z.array(z.string()),
  director: z.string().nullable(),
  cast: z.any().nullable(),
  crew: z.any().nullable(),
  poster: z.string().nullable(),
  backdrop: z.string().nullable(),
  originalLanguage: z.string().nullable(),
  budget: z.number().int().nullable(),
  revenue: z.number().int().nullable(),
  averageRating: z.number().nullable(),
  ratingCount: z.number().int(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

// Schema for paginated movies response
export const moviesListResponseSchema = z.object({
  data: z.array(movieResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Schema for error response
export const errorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

// Types inferred from schemas
export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export type MovieQueryParams = z.infer<typeof movieQuerySchema>;
export type MovieIdParam = z.infer<typeof movieIdParamSchema>;
export type CastMember = z.infer<typeof castMemberSchema>;
export type CrewMember = z.infer<typeof crewMemberSchema>;
