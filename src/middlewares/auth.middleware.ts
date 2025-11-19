import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: 'Invalid or expired token' });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.user || request.user.role !== 'ADMIN') {
    return reply.code(403).send({ message: 'Admin access required' });
  }
}
