import {
  meiliClient,
  MOVIES_INDEX,
  type MovieSearchDocument,
} from '../lib/meilisearch.js';
import type {
  SearchQueryParams,
  SearchResponse,
} from '../schemas/search.schema.js';

export class SearchService {
  /**
   * Search movies using Meilisearch
   */
  async searchMovies(params: SearchQueryParams): Promise<SearchResponse> {
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

    return {
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
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(query: string, limit = 5): Promise<string[]> {
    const index = meiliClient.index<MovieSearchDocument>(MOVIES_INDEX);

    const results = await index.search(query, {
      limit,
      attributesToRetrieve: ['title'],
    });

    return results.hits.map((hit) => hit.title);
  }

  /**
   * Get facet distribution for filters
   */
  async getFacets() {
    const index = meiliClient.index<MovieSearchDocument>(MOVIES_INDEX);

    const results = await index.search('', {
      limit: 0,
      facets: ['genres', 'originalLanguage'],
    });

    return {
      genres: results.facetDistribution?.genres || {},
      languages: results.facetDistribution?.originalLanguage || {},
    };
  }
}

// Export singleton instance
export const searchService = new SearchService();
