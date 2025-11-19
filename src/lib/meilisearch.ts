import { MeiliSearch } from 'meilisearch';
import { config } from '../config/index.js';
import type { Movie } from '@prisma/client';

export const meiliClient = new MeiliSearch({
  host: config.meilisearch.host,
  apiKey: config.meilisearch.apiKey,
});

export const MOVIES_INDEX = 'movies';

/**
 * Movie document structure for Meilisearch
 */
export interface MovieSearchDocument {
  id: string;
  title: string;
  description: string | null;
  releaseDate: string | null;
  duration: number | null;
  genres: string[];
  director: string | null;
  cast: Array<{ name: string; character?: string; order?: number }>;
  crew: Array<{ name: string; job?: string; department?: string }>;
  poster: string | null;
  backdrop: string | null;
  originalLanguage: string | null;
  averageRating: number;
  ratingCount: number;
  // Computed fields for search
  castNames: string[];
  crewNames: string[];
}

/**
 * Transform Prisma Movie to Meilisearch document
 */
export function transformMovieToSearchDocument(
  movie: Movie,
): MovieSearchDocument {
  const castArray = Array.isArray(movie.cast) ? movie.cast : [];
  const crewArray = Array.isArray(movie.crew) ? movie.crew : [];

  return {
    id: movie.id,
    title: movie.title,
    description: movie.description,
    releaseDate: movie.releaseDate?.toISOString() || null,
    duration: movie.duration,
    genres: movie.genres,
    director: movie.director,
    cast: castArray as any,
    crew: crewArray as any,
    poster: movie.poster,
    backdrop: movie.backdrop,
    originalLanguage: movie.originalLanguage,
    averageRating: movie.averageRating || 0,
    ratingCount: movie.ratingCount,
    // Extract names for easier searching
    castNames: castArray.map((c: any) => c.name).filter(Boolean),
    crewNames: crewArray.map((c: any) => c.name).filter(Boolean),
  };
}

/**
 * Initialize Meilisearch index with proper configuration
 */
export async function initializeMeilisearch() {
  try {
    const index = await meiliClient.getIndex(MOVIES_INDEX);
    console.log('✓ Meilisearch index already exists');

    // Configure index settings
    await configureIndex(index);
  } catch (error) {
    // Index doesn't exist, create it
    await meiliClient.createIndex(MOVIES_INDEX, { primaryKey: 'id' });
    console.log('✓ Meilisearch index created');

    const index = await meiliClient.getIndex(MOVIES_INDEX);
    await configureIndex(index);
  }
}

/**
 * Configure index settings for optimal search
 */
async function configureIndex(index: any) {
  // Set searchable attributes (in order of importance)
  await index.updateSearchableAttributes([
    'title',
    'director',
    'castNames',
    'crewNames',
    'description',
    'genres',
  ]);

  // Set filterable attributes
  await index.updateFilterableAttributes([
    'genres',
    'releaseDate',
    'director',
    'averageRating',
    'originalLanguage',
  ]);

  // Set sortable attributes
  await index.updateSortableAttributes([
    'releaseDate',
    'averageRating',
    'ratingCount',
    'title',
  ]);

  // Set displayed attributes (all fields by default)
  await index.updateDisplayedAttributes(['*']);

  // Configure ranking rules (default + custom)
  await index.updateRankingRules([
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'averageRating:desc',
  ]);

  // Set typo tolerance for better search experience
  await index.updateTypoTolerance({
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  });

  console.log('✓ Meilisearch index configured');
}
