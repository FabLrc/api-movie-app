import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { commentService } from '../services/comment.service';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createCommentSchema,
  updateCommentSchema,
  commentResponseSchema,
} from '../schemas/interaction.schema';

export async function commentRoutes(app: FastifyInstance) {
  // Create a comment
  app.post(
    '/movies/:id/comments',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: createCommentSchema,
        response: {
          201: commentResponseSchema,
          400: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
        tags: ['Comments'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params as { id: string };
        const { content } = request.body as { content: string };
        const userId = request.user!.id;

        const comment = await commentService.createComment(
          userId,
          movieId,
          content,
        );
        return reply.code(201).send(comment);
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

  // Get all comments for a movie
  app.get(
    '/movies/:id/comments',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(commentResponseSchema),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
        tags: ['Comments'],
      },
    },
    async (request, reply) => {
      const { id: movieId } = request.params as { id: string };
      const { page, limit } = request.query as { page: number; limit: number };

      const comments = await commentService.getMovieComments(
        movieId,
        page,
        limit,
      );
      return reply.send(comments);
    },
  );

  // Get a specific comment
  app.get(
    '/comments/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: commentResponseSchema,
          404: z.object({ message: z.string() }),
        },
        tags: ['Comments'],
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const comment = await commentService.getCommentById(id);
        return reply.send(comment);
      } catch (error) {
        if (error instanceof Error && error.message === 'Comment not found') {
          return reply.code(404).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  // Update a comment
  app.patch(
    '/comments/:id',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updateCommentSchema,
        response: {
          200: commentResponseSchema,
          400: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
        tags: ['Comments'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { content } = request.body as { content: string };
        const userId = request.user!.id;

        const comment = await commentService.updateComment(id, userId, content);
        return reply.send(comment);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Comment not found') {
            return reply.code(404).send({ message: error.message });
          }
          if (error.message === 'You can only update your own comments') {
            return reply.code(403).send({ message: error.message });
          }
          return reply.code(400).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  // Delete a comment
  app.delete(
    '/comments/:id',
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          204: z.null(),
          400: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
        tags: ['Comments'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.user!.id;
        const isAdmin = request.user!.role === 'ADMIN';

        await commentService.deleteComment(id, userId, isAdmin);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Comment not found') {
            return reply.code(404).send({ message: error.message });
          }
          if (error.message === 'You can only delete your own comments') {
            return reply.code(403).send({ message: error.message });
          }
          return reply.code(400).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  // Get user's all comments
  app.get(
    '/users/me/comments',
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
        tags: ['Comments'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query as { page: number; limit: number };
      const userId = request.user!.id;

      const comments = await commentService.getUserComments(
        userId,
        page,
        limit,
      );
      return reply.send(comments);
    },
  );
}
