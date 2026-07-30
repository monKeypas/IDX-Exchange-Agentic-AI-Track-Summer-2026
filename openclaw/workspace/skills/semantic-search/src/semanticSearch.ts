import { getEmbedding, getEmbeddings } from "./embeddings.js";
import { rankByCosineSimilarity } from "./cosine.js";
import {
  emptyCacheMeta,
  loadEmbeddingCache,
  saveEmbeddingCache,
  type CachedListingCard,
  type CachedListingEmbedding,
  type EmbeddingCache,
} from "./embeddingStore.js";
import { buildListingEmbeddingText, type ListingForEmbedding } from "./listingText.js";
import { query } from "./mysql.js";

export interface SemanticMatch {
  id: string;
  score: number;
  card: CachedListingCard;
}

export interface SemanticSearchResult {
  query: string;
  topK: number;
  cacheCount: number;
  matches: SemanticMatch[];
  reply: string;
}

export async function fetchActiveListingsForEmbedding(limit?: number): Promise<ListingForEmbedding[]> {
  const safeLimit =
    limit != null && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : null;

  let sql = `
SELECT
  L_ListingID, L_DisplayId, L_Address, L_City, L_Zip, L_Type_,
  L_SystemPrice, L_Keyword2, LM_Dec_3, LM_Int2_3, YearBuilt,
  L_Remarks, PhotoCount
FROM rets_property
WHERE L_Status = 'Active'
  AND L_Remarks IS NOT NULL
  AND TRIM(L_Remarks) <> ''
ORDER BY L_ListingID
`;
  if (safeLimit != null) sql += ` LIMIT ${safeLimit}`;

  return query<ListingForEmbedding>(sql);
}

function toCard(row: ListingForEmbedding): CachedListingCard {
  return {
    id: row.L_ListingID,
    displayId: row.L_DisplayId,
    address: row.L_Address,
    city: row.L_City,
    zip: row.L_Zip,
    type: row.L_Type_,
    price: row.L_SystemPrice,
    beds: row.L_Keyword2,
    baths: row.LM_Dec_3,
    sqft: row.LM_Int2_3,
    yearBuilt: row.YearBuilt,
    photoCount: row.PhotoCount,
  };
}

/** Precompute embeddings for active listings and write local cache. */
export async function buildEmbeddingIndex(options: {
  limit?: number;
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
} = {}): Promise<EmbeddingCache> {
  const batchSize = Math.max(1, Math.min(16, options.batchSize ?? 8));
  const rows = await fetchActiveListingsForEmbedding(options.limit);
  const listings: CachedListingEmbedding[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const texts = batch.map(buildListingEmbeddingText);
    const vectors = await getEmbeddings(texts, "RETRIEVAL_DOCUMENT");
    for (let j = 0; j < batch.length; j++) {
      listings.push({
        id: batch[j].L_ListingID,
        card: toCard(batch[j]),
        embedding: vectors[j],
      });
    }
    options.onProgress?.(Math.min(i + batch.length, rows.length), rows.length);
    // Free-tier embed RPM is tight; brief pause between batches.
    if (i + batchSize < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  const cache: EmbeddingCache = {
    ...emptyCacheMeta(options.limit ?? null),
    count: listings.length,
    listings,
  };
  saveEmbeddingCache(cache);
  return cache;
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSemanticResults(queryText: string, matches: SemanticMatch[]): string {
  if (matches.length === 0) {
    return `No semantic matches for: "${queryText}"`;
  }

  const lines = matches.map((match, index) => {
    const c = match.card;
    const address = [c.address, c.city, c.zip].filter(Boolean).join(", ") || "Address unavailable";
    const beds = c.beds != null ? `${c.beds} bd` : "beds N/A";
    const baths = c.baths != null ? `${c.baths} ba` : "baths N/A";
    const photos = c.photoCount != null ? `${c.photoCount} photos` : "photos N/A";
    const score = (match.score * 100).toFixed(1);
    return `${index + 1}) ${address}\n${formatCurrency(c.price)} · ${beds} / ${baths} · ${photos} · similarity ${score}%`;
  });

  return [
    `Top ${matches.length} semantic matches for: "${queryText}"`,
    "",
    lines.join("\n\n"),
  ].join("\n");
}

/** Embed the query and return top-k similar active listings from the local cache. */
export async function searchSemanticListings(
  queryText: string,
  options: { topK?: number } = {},
): Promise<SemanticSearchResult> {
  const topK = options.topK ?? 5;
  const text = queryText.trim();
  if (!text) {
    return {
      query: queryText,
      topK,
      cacheCount: 0,
      matches: [],
      reply: 'Usage: npm run search:semantic -- "charming craftsman with mountain views"',
    };
  }

  const cache = loadEmbeddingCache();
  const queryVec = await getEmbedding(text, "RETRIEVAL_QUERY");
  const ranked = rankByCosineSimilarity(
    queryVec,
    cache.listings.map((item) => ({ id: item.id, embedding: item.embedding })),
    topK,
  );

  const byId = new Map(cache.listings.map((item) => [item.id, item]));
  const matches: SemanticMatch[] = ranked.map((row) => ({
    id: row.id,
    score: row.score,
    card: byId.get(row.id)!.card,
  }));

  return {
    query: text,
    topK,
    cacheCount: cache.count,
    matches,
    reply: formatSemanticResults(text, matches),
  };
}
