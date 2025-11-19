/**
 * Benchmark Script - Test API Performance with and without cache
 *
 * This script tests the performance of various API endpoints
 * and measures the impact of Redis caching.
 *
 * Usage: npm run benchmark
 */

import axios, { type AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ITERATIONS = 100;

interface BenchmarkResult {
  endpoint: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  requestsPerSecond: number;
  cached?: boolean;
}

class BenchmarkRunner {
  private client: AxiosInstance;
  private authToken?: string;
  private movieId?: string;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
    });
  }

  /**
   * Get a valid movie ID for testing
   */
  async getValidMovieId(): Promise<string | null> {
    try {
      const response = await this.client.get('/movies?limit=1');
      if (response.data?.data?.[0]?.id) {
        const id = response.data.data[0].id as string;
        this.movieId = id;
        console.log(`✓ Found movie ID: ${this.movieId}\n`);
        return id;
      }
      console.warn('⚠ No movies found in database\n');
      return null;
    } catch (error) {
      console.error('⚠ Failed to fetch movie ID:', error);
      return null;
    }
  }

  /**
   * Authenticate and get a token
   */
  async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/auth/login', {
        email: 'test@example.com',
        password: 'Test123456!',
      });
      this.authToken = response.data.token;
      this.client.defaults.headers.common['Authorization'] =
        `Bearer ${this.authToken}`;
      console.log('✓ Authentication successful\n');
    } catch {
      console.warn('⚠ Authentication failed, continuing without auth\n');
    }
  }

  /**
   * Flush all cache before benchmarking
   */
  async flushCache(): Promise<void> {
    try {
      await this.client.delete('/admin/cache');
      console.log('✓ Cache flushed\n');
    } catch {
      console.warn('⚠ Could not flush cache, continuing anyway\n');
    }
  }

  /**
   * Benchmark a single endpoint
   */
  async benchmarkEndpoint(
    name: string,
    url: string,
    iterations: number = ITERATIONS,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    let errors = 0;

    console.log(`\nBenchmarking ${name}...`);
    console.log(`URL: ${url}`);
    console.log(`Iterations: ${iterations}`);

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        await this.client.get(url);
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        errors++;
        if (errors === 1) {
          // Only log first error to avoid spam
          console.error(
            `\n⚠ Error on iteration ${i + 1}:`,
            (error as Error).message,
          );
        }
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        process.stdout.write('.');
      }
    }

    console.log('\n');

    if (times.length === 0) {
      throw new Error(`All ${iterations} requests failed for ${name}`);
    }

    if (errors > 0) {
      console.warn(`⚠ ${errors}/${iterations} requests failed\n`);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const avgTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const requestsPerSecond = (1000 / avgTime) * times.length;

    return {
      endpoint: name,
      iterations: times.length,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      requestsPerSecond,
    };
  }

  /**
   * Test cache effectiveness by comparing cold vs warm requests
   */
  async testCacheEffectiveness(
    name: string,
    url: string,
  ): Promise<{ cold: BenchmarkResult; warm: BenchmarkResult }> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Cache Effectiveness Test: ${name}`);
    console.log('='.repeat(60));

    // Flush cache and test cold requests
    await this.flushCache();
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(() => resolve(), 500);
    }); // Wait for cache to flush

    console.log('\n1. Testing COLD requests (no cache)...');
    const coldResult = await this.benchmarkEndpoint(
      `${name} (Cold)`,
      url,
      ITERATIONS,
    );

    // Test warm requests (should hit cache)
    console.log('\n2. Testing WARM requests (with cache)...');
    const warmResult = await this.benchmarkEndpoint(
      `${name} (Warm)`,
      url,
      ITERATIONS,
    );

    // Calculate improvement
    const improvement =
      ((coldResult.avgTime - warmResult.avgTime) / coldResult.avgTime) * 100;

    console.log('\n📊 Results:');
    console.log('─'.repeat(60));
    console.log(`Cold Avg: ${coldResult.avgTime.toFixed(2)}ms`);
    console.log(`Warm Avg: ${warmResult.avgTime.toFixed(2)}ms`);
    console.log(
      `Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% ${improvement > 0 ? '🚀' : ''}`,
    );
    console.log(
      `Cache Hit Speedup: ${(coldResult.avgTime / warmResult.avgTime).toFixed(2)}x`,
    );
    console.log('─'.repeat(60));

    return { cold: coldResult, warm: warmResult };
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('\n🚀 Starting API Performance Benchmark');
    console.log('='.repeat(60));
    console.log(`API URL: ${API_URL}`);
    console.log(`Iterations per test: ${ITERATIONS}`);
    console.log('='.repeat(60));

    // Try to authenticate
    await this.authenticate();

    // Get a valid movie ID
    const movieId = await this.getValidMovieId();
    if (!movieId) {
      console.error('❌ Cannot run benchmarks without movie data.');
      console.log(
        '\n💡 Tip: Run "npm run prisma:seed" to populate the database.\n',
      );
      process.exit(1);
    }

    const results: {
      cold: BenchmarkResult;
      warm: BenchmarkResult;
      improvement: number;
    }[] = [];

    // Test 1: Get single movie by ID
    try {
      const test1 = await this.testCacheEffectiveness(
        'GET /movies/:id',
        `/movies/${movieId}`,
      );
      results.push({
        ...test1,
        improvement:
          ((test1.cold.avgTime - test1.warm.avgTime) / test1.cold.avgTime) *
          100,
      });
    } catch (error) {
      console.error('❌ Test 1 failed:', (error as Error).message);
    }

    // Test 2: List movies with pagination
    try {
      const test2 = await this.testCacheEffectiveness(
        'GET /movies (paginated)',
        '/movies?page=1&limit=20',
      );
      results.push({
        ...test2,
        improvement:
          ((test2.cold.avgTime - test2.warm.avgTime) / test2.cold.avgTime) *
          100,
      });
    } catch (error) {
      console.error('❌ Test 2 failed:', (error as Error).message);
    }

    // Test 3: Search movies
    try {
      const test3 = await this.testCacheEffectiveness(
        'GET /search',
        '/search?q=action',
      );
      results.push({
        ...test3,
        improvement:
          ((test3.cold.avgTime - test3.warm.avgTime) / test3.cold.avgTime) *
          100,
      });
    } catch (error) {
      console.error('❌ Test 3 failed:', (error as Error).message);
    }

    // Test 4: Get movie comments
    try {
      const test4 = await this.testCacheEffectiveness(
        'GET /movies/:id/comments',
        `/movies/${movieId}/comments`,
      );
      results.push({
        ...test4,
        improvement:
          ((test4.cold.avgTime - test4.warm.avgTime) / test4.cold.avgTime) *
          100,
      });
    } catch (error) {
      console.error('❌ Test 4 failed:', (error as Error).message);
    }

    // Print summary only if we have results
    if (results.length > 0) {
      this.printSummary(results);
    } else {
      console.error('\n❌ All benchmark tests failed.\n');
      process.exit(1);
    }
  }

  /**
   * Print benchmark summary
   */
  private printSummary(
    results: {
      cold: BenchmarkResult;
      warm: BenchmarkResult;
      improvement: number;
    }[],
  ): void {
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('📈 BENCHMARK SUMMARY');
    console.log('='.repeat(80));
    console.log(
      '\n| Endpoint                    | Cold (ms) | Warm (ms) | Improvement | Speedup |',
    );
    console.log(
      '|-----------------------------|-----------|--------------|-------------|---------|',
    );

    for (const result of results) {
      const endpoint = result.cold.endpoint.replace(' (Cold)', '').padEnd(27);
      const cold = result.cold.avgTime.toFixed(2).padStart(9);
      const warm = result.warm.avgTime.toFixed(2).padStart(9);
      const improvement =
        `${result.improvement > 0 ? '+' : ''}${result.improvement.toFixed(1)}%`.padStart(
          11,
        );
      const speedup =
        `${(result.cold.avgTime / result.warm.avgTime).toFixed(2)}x`.padStart(
          7,
        );

      console.log(
        `| ${endpoint} | ${cold} | ${warm} | ${improvement} | ${speedup} |`,
      );
    }

    console.log('='.repeat(80));

    // Calculate average improvement
    const avgImprovement =
      results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
    console.log(
      `\n✨ Average Performance Improvement: ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}%`,
    );

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (avgImprovement > 50) {
      console.log('   ✓ Excellent cache performance! Keep it up.');
    } else if (avgImprovement > 20) {
      console.log('   ✓ Good cache performance. Consider increasing TTLs.');
    } else if (avgImprovement > 0) {
      console.log(
        '   ⚠ Moderate cache benefit. Review cache strategy and TTLs.',
      );
    } else {
      console.log(
        '   ❌ Cache not providing benefit. Check Redis configuration.',
      );
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// Run benchmarks
const runner = new BenchmarkRunner();
runner.runAll().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
