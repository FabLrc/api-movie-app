import { z } from 'zod';

// =============================
// Rating Schemas
// =============================

export const createRatingSchema = z.object({
  rating: z.number().int().min(1).max(10).describe('Rating from 1 to 10'),
});

export const ratingResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  movieId: z.string().uuid(),
  rating: z.number().int().min(1).max(10),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  updatedAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type RatingResponse = z.infer<typeof ratingResponseSchema>;

// =============================
// Comment Schemas
// =============================

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000).describe('Comment content'),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000).describe('Updated comment content'),
});

export const commentResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  movieId: z.string().uuid(),
  content: z.string(),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  updatedAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  user: z
    .object({
      id: z.string().uuid(),
      username: z.string(),
    })
    .optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentResponse = z.infer<typeof commentResponseSchema>;

// =============================
// Favorite Schemas
// =============================

export const favoriteResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  movieId: z.string().uuid(),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
});

export type FavoriteResponse = z.infer<typeof favoriteResponseSchema>;

// =============================
// Watched Schemas
// =============================

export const watchedResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  movieId: z.string().uuid(),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
});

export type WatchedResponse = z.infer<typeof watchedResponseSchema>;

// =============================
// Query Schemas
// =============================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
