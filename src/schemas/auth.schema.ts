import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  role: z.enum(['USER', 'ADMIN']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userResponseSchema,
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
