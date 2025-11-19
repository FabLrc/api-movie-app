import { buildApp } from './app.js';
import { config } from './config/index.js';
import { initializeMeilisearch } from './lib/meilisearch.js';

async function start() {
  try {
    // Initialize Meilisearch
    await initializeMeilisearch();

    const app = await buildApp();

    await app.listen({
      port: config.app.port,
      host: config.app.host,
    });

    app.log.info(
      `Server listening on http://${config.app.host}:${config.app.port}`,
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
