import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ratingService } from '../services/rating.service';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createRatingSchema,
  ratingResponseSchema,
} from '../schemas/interaction.schema';

export async function ratingRoutes(app: FastifyInstance) {
  // Create or update a rating
  app.post(
    '/movies/:id/rate',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: createRatingSchema,
        response: {
          200: ratingResponseSchema,
          201: ratingResponseSchema,
          400: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
        tags: ['Ratings'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params as { id: string };
        const { rating } = request.body as { rating: number };
        const userId = request.user!.id;

        // Check if rating already exists
        const existingRating = await ratingService.getRating(userId, movieId);
        const statusCode = existingRating ? 200 : 201;

        const userRating = await ratingService.upsertRating(
          userId,
          movieId,
          rating,
        );
        return reply.code(statusCode).send(userRating);
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

  // Get user's rating for a movie
  app.get(
    '/movies/:id/rate',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: ratingResponseSchema,
          404: z.object({ message: z.string() }),
        },
        tags: ['Ratings'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id: movieId } = request.params as { id: string };
      const userId = request.user!.id;

      const rating = await ratingService.getRating(userId, movieId);
      if (!rating) {
        return reply.code(404).send({ message: 'Rating not found' });
      }
      return reply.send(rating);
    },
  );

  // Delete a rating
  app.delete(
    '/movies/:id/rate',
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
        tags: ['Ratings'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params as { id: string };
        const userId = request.user!.id;

        await ratingService.deleteRating(userId, movieId);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof Error) {
          return reply.code(400).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  // Get all ratings for a movie
  app.get(
    '/movies/:id/ratings',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.array(ratingResponseSchema),
        },
        tags: ['Ratings'],
      },
    },
    async (request, reply) => {
      const { id: movieId } = request.params as { id: string };
      const ratings = await ratingService.getMovieRatings(movieId);
      return reply.send(ratings);
    },
  );

  // Get user's all ratings
  app.get(
    '/users/me/ratings',
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
        tags: ['Ratings'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query as { page: number; limit: number };
      const userId = request.user!.id;

      const ratings = await ratingService.getUserRatings(userId, page, limit);
      return reply.send(ratings);
    },
  );
}
