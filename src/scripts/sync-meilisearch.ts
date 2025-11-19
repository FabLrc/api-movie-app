/**
 * Script to synchronize all movies from PostgreSQL to Meilisearch
 * Run with: npm run sync:meilisearch
 */
import { prisma } from '../lib/prisma.js';
import {
  meiliClient,
  MOVIES_INDEX,
  transformMovieToSearchDocument,
  initializeMeilisearch,
} from '../lib/meilisearch.js';

async function syncMoviesToMeilisearch() {
  console.log('🚀 Starting Meilisearch synchronization...\n');

  try {
    // 1. Initialize Meilisearch index
    console.log('📋 Initializing Meilisearch index...');
    await initializeMeilisearch();

    // 2. Get all movies from PostgreSQL
    console.log('\n📚 Fetching movies from PostgreSQL...');
    const movies = await prisma.movie.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`✓ Found ${movies.length} movies to sync`);

    if (movies.length === 0) {
      console.log('\n⚠️  No movies found in database. Run seed first.');
      return;
    }

    // 3. Transform movies to search documents
    console.log('\n🔄 Transforming movies to search documents...');
    const searchDocuments = movies.map(transformMovieToSearchDocument);
    console.log(`✓ Transformed ${searchDocuments.length} documents`);

    // 4. Index documents in batches
    console.log('\n📤 Indexing documents in Meilisearch...');
    const index = meiliClient.index(MOVIES_INDEX);

    const batchSize = 1000;
    let indexed = 0;

    for (let i = 0; i < searchDocuments.length; i += batchSize) {
      const batch = searchDocuments.slice(i, i + batchSize);
      const task = await index.addDocuments(batch);
      console.log(
        `  → Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} documents (Task ID: ${task.taskUid})`,
      );
      indexed += batch.length;

      // Wait for task to complete
      await index.waitForTask(task.taskUid);
    }

    console.log(`✓ Successfully indexed ${indexed} documents`);

    // 5. Verify indexation
    console.log('\n🔍 Verifying indexation...');
    const stats = await index.getStats();
    console.log(`✓ Index contains ${stats.numberOfDocuments} documents`);

    console.log('\n✅ Synchronization completed successfully!');
  } catch (error) {
    console.error('\n❌ Synchronization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
syncMoviesToMeilisearch().catch(console.error);
