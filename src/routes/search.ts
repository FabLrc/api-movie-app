import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { searchService } from '../services/search.service.js';
import {
  searchQuerySchema,
  searchResponseSchema,
} from '../schemas/search.schema.js';
import { errorSchema } from '../schemas/movie.schema.js';

export async function searchRoutes(app: FastifyInstance) {
  // GET /search - Search movies
  app.withTypeProvider<ZodTypeProvider>().get(
    '/search',
    {
      schema: {
        tags: ['Search'],
        summary: 'Search movies',
        description:
          'Full-text search with typo tolerance, filters, and sorting',
        querystring: searchQuerySchema,
        response: {
          200: searchResponseSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const results = await searchService.searchMovies(request.query);
        return reply.send(results);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Search failed',
        });
      }
    },
  );

  // GET /search/suggestions - Get autocomplete suggestions
  app.withTypeProvider<ZodTypeProvider>().get(
    '/search/suggestions',
    {
      schema: {
        tags: ['Search'],
        summary: 'Get search suggestions',
        description: 'Autocomplete suggestions based on query',
        querystring: z.object({
          q: z.string().min(1).describe('Search query'),
          limit: z.coerce
            .number()
            .int()
            .positive()
            .max(20)
            .default(5)
            .describe('Number of suggestions'),
        }),
        response: {
          200: z.object({
            suggestions: z.array(z.string()),
          }),
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { q, limit } = request.query;
        const suggestions = await searchService.getSuggestions(q, limit);
        return reply.send({ suggestions });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get suggestions',
        });
      }
    },
  );

  // GET /search/facets - Get available facets for filtering
  app.withTypeProvider<ZodTypeProvider>().get(
    '/search/facets',
    {
      schema: {
        tags: ['Search'],
        summary: 'Get search facets',
        description: 'Get available genres and languages for filtering',
        response: {
          200: z.object({
            genres: z.record(z.string(), z.number()),
            languages: z.record(z.string(), z.number()),
          }),
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const facets = await searchService.getFacets();
        return reply.send(facets);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get facets',
        });
      }
    },
  );
}
