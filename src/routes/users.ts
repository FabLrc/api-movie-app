import { FastifyInstance } from 'fastify';
import { userRepository } from '../repositories/user.repository.js';
import { userService } from '../services/user.service.js';
import {
  userResponseSchema,
  updateUserSchema,
  UpdateUserInput,
} from '../schemas/auth.schema.js';
import { z } from 'zod';

export async function userRoutes(app: FastifyInstance) {
  app.get(
    '/users',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().min(1).default(1),
          limit: z.coerce.number().min(1).max(100).default(20),
        }),
        response: {
          200: z.array(userResponseSchema),
          403: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Forbidden' });
      }
      const { page, limit } = request.query as { page: number; limit: number };
      const skip = (page - 1) * limit;
      const users = await userRepository.findAll(skip, limit);
      return users;
    },
  );

  app.put(
    '/users/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        body: updateUserSchema,
        response: {
          200: userResponseSchema,
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const updatedUser = await userService.update(
          request.user.id,
          request.body as UpdateUserInput,
        );
        return updatedUser;
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === 'Email already in use' ||
            error.message === 'Username already in use')
        ) {
          return reply.code(409).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  app.delete(
    '/users/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string() }),
        response: {
          204: z.null(),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Forbidden' });
      }
      const { id } = request.params as { id: string };

      try {
        await userRepository.delete(id);
        return reply.code(204).send();
      } catch {
        return reply.code(404).send({ message: 'User not found' });
      }
    },
  );
}
