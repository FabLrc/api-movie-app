import 'dotenv/config';

export const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    publicUrl:
      process.env.PUBLIC_URL ||
      `http://localhost:${parseInt(process.env.PORT || '3000', 10)}`,
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  meilisearch: {
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
