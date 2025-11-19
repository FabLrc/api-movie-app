import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  userResponseSchema,
  loginResponseSchema,
  RegisterInput,
  LoginInput,
} from '../schemas/auth.schema.js';

import { z } from 'zod';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/register',
    {
      schema: {
        body: registerSchema,
        response: {
          201: userResponseSchema,
          409: z.object({ message: z.string() }),
        },
        tags: ['Auth'],
      },
    },
    async (request, reply) => {
      try {
        const user = await authService.register(request.body as RegisterInput);
        return reply.code(201).send(user);
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

  app.post(
    '/login',
    {
      schema: {
        body: loginSchema,
        response: {
          200: loginResponseSchema,
          401: z.object({ message: z.string() }),
        },
        tags: ['Auth'],
      },
    },
    async (request, reply) => {
      const user = await authService.validateUser(request.body as LoginInput);
      if (!user) {
        return reply.code(401).send({ message: 'Invalid email or password' });
      }

      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      return { token, user };
    },
  );

  app.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            id: z.string(),
            email: z.string(),
            role: z.string(),
            iat: z.number(),
            exp: z.number().optional(),
          }),
        },
      },
    },
    async (request) => {
      return request.user;
    },
  );
}
