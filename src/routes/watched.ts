import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { watchedService } from '../services/watched.service';
import { authenticate } from '../middlewares/auth.middleware';
import { watchedResponseSchema } from '../schemas/interaction.schema';

export async function watchedRoutes(app: FastifyInstance) {
  // Mark a movie as watched
  app.post(
    '/movies/:id/watched',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          201: watchedResponseSchema,
          400: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
        tags: ['Watched'],
        security: [{ bearerAuth: [] }],
        description: 'Mark a movie as watched',
      },
    },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params as { id: string };
        const userId = request.user!.id;

        const watched = await watchedService.markAsWatched(userId, movieId);
        return reply.code(201).send(watched);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Movie not found') {
            return reply.code(404).send({ message: error.message });
          }
          return reply.code(400).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  // Unmark a movie as watched
  app.delete(
    '/movies/:id/watched',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          204: z.null(),
          400: z.object({ message: z.string() }),
        },
        tags: ['Watched'],
        security: [{ bearerAuth: [] }],
        description: 'Unmark a movie as watched',
      },
    },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params as { id: string };
        const userId = request.user!.id;

        await watchedService.unmarkAsWatched(userId, movieId);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof Error) {
          return reply.code(400).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  // Check if movie is watched
  app.get(
    '/movies/:id/watched',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({ isWatched: z.boolean() }),
        },
        tags: ['Watched'],
        security: [{ bearerAuth: [] }],
        description: 'Check if a movie is marked as watched',
      },
    },
    async (request, reply) => {
      const { id: movieId } = request.params as { id: string };
      const userId = request.user!.id;

      const isWatched = await watchedService.isWatched(userId, movieId);
      return reply.send({ isWatched });
    },
  );

  // Get user's watched movies
  app.get(
    '/users/me/watched',
    {
      preHandler: authenticate,
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(z.any()),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
        tags: ['Watched'],
        security: [{ bearerAuth: [] }],
        description: "Get user's watched movies with pagination",
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query as { page: number; limit: number };
      const userId = request.user!.id;

      const watched = await watchedService.getUserWatchedMovies(
        userId,
        page,
        limit,
      );
      return reply.send(watched);
    },
  );

  // Get user's watch statistics
  app.get(
    '/users/me/watched/stats',
    {
      preHandler: authenticate,
      schema: {
        response: {
          200: z.object({
            totalWatched: z.number(),
          }),
        },
        tags: ['Watched'],
        security: [{ bearerAuth: [] }],
        description: "Get user's watch statistics",
      },
    },
    async (request, reply) => {
      const userId = request.user!.id;

      const stats = await watchedService.getUserWatchedStats(userId);
      return reply.send(stats);
    },
  );

  // Get recently watched movies
  app.get(
    '/users/me/watched/recent',
    {
      preHandler: authenticate,
      schema: {
        querystring: z.object({
          limit: z.coerce.number().int().positive().max(50).default(10),
        }),
        response: {
          200: z.array(z.any()),
        },
        tags: ['Watched'],
        security: [{ bearerAuth: [] }],
        description: 'Get recently watched movies',
      },
    },
    async (request, reply) => {
      const { limit } = request.query as { limit: number };
      const userId = request.user!.id;

      const recentlyWatched = await watchedService.getRecentlyWatched(
        userId,
        limit,
      );
      return reply.send(recentlyWatched);
    },
  );
}
