import { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: 'USER' | 'ADMIN' };
    user: {
      id: string;
      email: string;
      role: 'USER' | 'ADMIN';
      iat: number;
      exp: number;
    };
  }
}
