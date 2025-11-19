import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { favoriteService } from '../services/favorite.service';
import { authenticate } from '../middlewares/auth.middleware';
import { favoriteResponseSchema } from '../schemas/interaction.schema';

export async function favoriteRoutes(app: FastifyInstance) {
  // Add a movie to favorites
  app.post(
    '/movies/:id/favorite',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          201: favoriteResponseSchema,
          400: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
        tags: ['Favorites'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params as { id: string };
        const userId = request.user!.id;

        const favorite = await favoriteService.addFavorite(userId, movieId);
        return reply.code(201).send(favorite);
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

  // Remove a movie from favorites
  app.delete(
    '/movies/:id/favorite',
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
        tags: ['Favorites'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params as { id: string };
        const userId = request.user!.id;

        await favoriteService.removeFavorite(userId, movieId);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof Error) {
          return reply.code(400).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  // Check if movie is favorited
  app.get(
    '/movies/:id/favorite',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({ isFavorite: z.boolean() }),
        },
        tags: ['Favorites'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id: movieId } = request.params as { id: string };
      const userId = request.user!.id;

      const isFavorite = await favoriteService.isFavorite(userId, movieId);
      return reply.send({ isFavorite });
    },
  );

  // Get user's favorite movies
  app.get(
    '/users/me/favorites',
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
        tags: ['Favorites'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query as { page: number; limit: number };
      const userId = request.user!.id;

      const favorites = await favoriteService.getUserFavorites(
        userId,
        page,
        limit,
      );
      return reply.send(favorites);
    },
  );
}
