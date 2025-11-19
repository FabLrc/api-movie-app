import { z } from 'zod';

/**
 * Search query parameters schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1).describe('Search query'),
  page: z.coerce.number().int().positive().default(1).describe('Page number'),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe('Items per page'),
  genres: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Filter by genres'),
  minRating: z.coerce
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe('Minimum average rating'),
  sort: z
    .enum(['relevance', 'rating:desc', 'rating:asc', 'date:desc', 'date:asc'])
    .default('relevance')
    .describe('Sort order'),
});

export type SearchQueryParams = z.infer<typeof searchQuerySchema>;

/**
 * Search result item schema
 */
export const searchResultItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  releaseDate: z.string().nullable(),
  duration: z.number().nullable(),
  genres: z.array(z.string()),
  director: z.string().nullable(),
  cast: z.array(z.any()),
  crew: z.array(z.any()),
  poster: z.string().nullable(),
  backdrop: z.string().nullable(),
  originalLanguage: z.string().nullable(),
  averageRating: z.number(),
  ratingCount: z.number(),
  castNames: z.array(z.string()),
  crewNames: z.array(z.string()),
});

/**
 * Search response schema
 */
export const searchResponseSchema = z.object({
  data: z.array(searchResultItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  meta: z.object({
    query: z.string(),
    processingTimeMs: z.number(),
    estimatedTotalHits: z.number(),
  }),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
