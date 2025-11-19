import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { movieService, MovieNotFoundError } from '../services/movie.service.js';
import {
  createMovieSchema,
  updateMovieSchema,
  movieQuerySchema,
  movieIdParamSchema,
  movieResponseSchema,
  moviesListResponseSchema,
  errorSchema,
} from '../schemas/movie.schema.js';

export async function movieRoutes(app: FastifyInstance) {
  // GET /movies - List all movies with pagination
  app.withTypeProvider<ZodTypeProvider>().get(
    '/movies',
    {
      schema: {
        tags: ['Movies'],
        summary: 'List all movies',
        querystring: movieQuerySchema,
        response: {
          200: moviesListResponseSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await movieService.getMovies(request.query);
        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch movies',
        });
      }
    },
  );

  // GET /movies/:id - Get a single movie by ID
  app.withTypeProvider<ZodTypeProvider>().get(
    '/movies/:id',
    {
      schema: {
        tags: ['Movies'],
        summary: 'Get a movie by ID',
        params: movieIdParamSchema,
        response: {
          200: movieResponseSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const movie = await movieService.getMovieById(request.params.id);
        return reply.send(movie);
      } catch (error) {
        if (error instanceof MovieNotFoundError) {
          return reply.code(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch movie',
        });
      }
    },
  );

  // POST /movies - Create a new movie
  app.withTypeProvider<ZodTypeProvider>().post(
    '/movies',
    {
      schema: {
        tags: ['Movies'],
        summary: 'Create a new movie',
        body: createMovieSchema,
        response: {
          201: movieResponseSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const movie = await movieService.createMovie(request.body);
        return reply.code(201).send(movie);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create movie',
        });
      }
    },
  );

  // PUT /movies/:id - Update an existing movie
  app.withTypeProvider<ZodTypeProvider>().put(
    '/movies/:id',
    {
      schema: {
        tags: ['Movies'],
        summary: 'Update a movie',
        params: movieIdParamSchema,
        body: updateMovieSchema,
        response: {
          200: movieResponseSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const movie = await movieService.updateMovie(
          request.params.id,
          request.body,
        );
        return reply.send(movie);
      } catch (error) {
        if (error instanceof MovieNotFoundError) {
          return reply.code(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update movie',
        });
      }
    },
  );

  // DELETE /movies/:id - Delete a movie
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/movies/:id',
    {
      schema: {
        tags: ['Movies'],
        summary: 'Delete a movie',
        params: movieIdParamSchema,
        response: {
          204: z.null(),
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        await movieService.deleteMovie(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof MovieNotFoundError) {
          return reply.code(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete movie',
        });
      }
    },
  );
}
