import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  getEmbeddingProvider,
} from "./embeddings.js";

export interface CachedListingCard {
  id: string;
  displayId: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  type: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  photoCount: number | null;
}

export interface CachedListingEmbedding {
  id: string;
  card: CachedListingCard;
  embedding: number[];
}

export interface EmbeddingCache {
  version: 1;
  model: string;
  dimensions: number;
  builtAt: string;
  limit: number | null;
  count: number;
  listings: CachedListingEmbedding[];
}

const STORE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".embeddings");
export const DEFAULT_CACHE_PATH = join(STORE_DIR, "active-listings.json");

export function getCachePath(): string {
  return process.env.SEMANTIC_EMBEDDINGS_PATH?.trim() || DEFAULT_CACHE_PATH;
}

export function loadEmbeddingCache(path = getCachePath()): EmbeddingCache {
  if (!existsSync(path)) {
    throw new Error(
      `Embedding cache not found at ${path}. Run: npm run embed:build -- --limit 500`,
    );
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as EmbeddingCache;
  if (!raw?.listings?.length) {
    throw new Error(`Embedding cache at ${path} is empty.`);
  }
  assertCacheMatchesProvider(raw);
  return raw;
}

/** Fail fast if the cache was built with a different embedding model. */
export function assertCacheMatchesProvider(cache: EmbeddingCache): void {
  if (cache.model === EMBEDDING_MODEL && cache.dimensions === EMBEDDING_DIMENSIONS) {
    return;
  }
  const provider = getEmbeddingProvider();
  throw new Error(
    `Embedding cache model mismatch: cache has ${cache.model} (${cache.dimensions}d), ` +
      `but current provider "${provider}" expects ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}d). ` +
      `Rebuild with: npm run embed:build -- --limit 500`,
  );
}

export function saveEmbeddingCache(cache: EmbeddingCache, path = getCachePath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cache));
}

export function emptyCacheMeta(limit: number | null): Omit<EmbeddingCache, "listings" | "count"> {
  return {
    version: 1,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    builtAt: new Date().toISOString(),
    limit,
  };
}
