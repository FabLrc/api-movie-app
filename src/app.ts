import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyJwt from '@fastify/jwt';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { config } from './config/index.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { movieRoutes } from './routes/movies.js';
import { searchRoutes } from './routes/search.js';
import { favoriteRoutes } from './routes/favorites.js';
import { ratingRoutes } from './routes/ratings.js';
import { commentRoutes } from './routes/comments.js';
import { watchedRoutes } from './routes/watched.js';
import { adminRoutes } from './routes/admin.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logging.level,
      transport:
        config.app.env === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Set up Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // JWT
  await app.register(fastifyJwt, {
    secret: config.jwt.secret,
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Plugins
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Movie API',
        description: 'API REST haute performance pour catalogue de films',
        version: '1.0.0',
      },
      servers: [
        {
          url: config.app.publicUrl,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/doc',
  });

  await app.register(helmet, {
    global: config.app.env === 'production',
    crossOriginOpenerPolicy:
      config.app.env === 'production' ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        connectSrc: ["'self'"],
      },
    },
  });

  await app.register(cors, {
    origin: config.app.env === 'production' ? false : '*',
    credentials: true,
  });

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(movieRoutes);
  await app.register(searchRoutes);
  await app.register(favoriteRoutes);
  await app.register(ratingRoutes);
  await app.register(commentRoutes);
  await app.register(watchedRoutes);
  await app.register(adminRoutes);

  // Root route
  app.get('/', async () => {
    return {
      name: 'Movie API',
      version: '1.0.0',
      status: 'running',
    };
  });

  return app;
}
