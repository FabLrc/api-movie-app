import {
  meiliClient,
  MOVIES_INDEX,
  type MovieSearchDocument,
} from '../lib/meilisearch.js';
import type {
  SearchQueryParams,
  SearchResponse,
} from '../schemas/search.schema.js';
import { cacheService, CacheService } from './cache.service.js';

export class SearchService {
  /**
   * Search movies using Meilisearch with caching
   */
  async searchMovies(params: SearchQueryParams): Promise<SearchResponse> {
    // Generate cache key from search parameters
    const cacheKey = cacheService.generateKey(
      CacheService.PREFIXES.SEARCH,
      params,
    );

    // Try to get from cache
    const cached = await cacheService.get<SearchResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const { q, page, limit, genres, minRating, sort } = params;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build filter string
    const filters: string[] = [];

    if (genres) {
      const genreList = Array.isArray(genres) ? genres : [genres];
      if (genreList.length > 0) {
        const genreFilters = genreList.map((genre) => `genres = "${genre}"`);
        filters.push(`(${genreFilters.join(' OR ')})`);
      }
    }

    if (minRating !== undefined) {
      filters.push(`averageRating >= ${minRating}`);
    }

    const filter = filters.length > 0 ? filters.join(' AND ') : undefined;

    // Build sort array
    let sortArray: string[] | undefined;
    if (sort !== 'relevance') {
      const sortMap = {
        'rating:desc': 'averageRating:desc',
        'rating:asc': 'averageRating:asc',
        'date:desc': 'releaseDate:desc',
        'date:asc': 'releaseDate:asc',
      };
      sortArray = [sortMap[sort]];
    }

    // Execute search
    const index = meiliClient.index<MovieSearchDocument>(MOVIES_INDEX);

    const searchResults = await index.search(q, {
      offset,
      limit,
      filter,
      sort: sortArray,
      attributesToRetrieve: ['*'],
    });

    // Calculate pagination metadata
    const total = searchResults.estimatedTotalHits || 0;
    const totalPages = Math.ceil(total / limit);

    const response: SearchResponse = {
      data: searchResults.hits,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      meta: {
        query: q,
        processingTimeMs: searchResults.processingTimeMs,
        estimatedTotalHits: total,
      },
    };

    // Cache search results for 2 minutes
    await cacheService.set(cacheKey, response, CacheService.TTL.SHORT * 2);

    return response;
  }

  /**
   * Get search suggestions (autocomplete) with caching
   */
  async getSuggestions(query: string, limit = 5): Promise<string[]> {
    const cacheKey = `${CacheService.PREFIXES.SEARCH}suggestions:${query}:${limit}`;

    // Try to get from cache
    const cached = await cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const index = meiliClient.index<MovieSearchDocument>(MOVIES_INDEX);

    const results = await index.search(query, {
      limit,
      attributesToRetrieve: ['title'],
    });

    const suggestions = results.hits.map((hit) => hit.title);

    // Cache suggestions for 5 minutes
    await cacheService.set(cacheKey, suggestions, CacheService.TTL.MEDIUM);

    return suggestions;
  }

  /**
   * Get facet distribution for filters with caching
   */
  async getFacets() {
    const cacheKey = `${CacheService.PREFIXES.SEARCH}facets`;

    // Try to get from cache
    const cached =
      await cacheService.get<{
        genres: Record<string, number>;
        languages: Record<string, number>;
      }>(cacheKey);
    if (cached) {
      return cached;
    }

    const index = meiliClient.index<MovieSearchDocument>(MOVIES_INDEX);

    const results = await index.search('', {
      limit: 0,
      facets: ['genres', 'originalLanguage'],
    });

    const facets = {
      genres: results.facetDistribution?.genres || {},
      languages: results.facetDistribution?.originalLanguage || {},
    };

    // Cache facets for 1 hour (they change rarely)
    await cacheService.set(cacheKey, facets, CacheService.TTL.LONG);

    return facets;
  }
}

// Export singleton instance
export const searchService = new SearchService();
