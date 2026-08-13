import { cosineSimilarity } from "../../semantic-search/src/cosine.js";
import { getEmbedding } from "../../semantic-search/src/embeddings.js";
import {
  loadEmbeddingCache,
  type CachedListingEmbedding,
} from "../../semantic-search/src/embeddingStore.js";
import { buildListingEmbeddingText } from "../../semantic-search/src/listingText.js";
import { query } from "./mysql.js";

export interface ResolvedTarget {
  id: string;
  source: "address" | "semantic";
  description: string;
  listing: CachedListingEmbedding;
}

/** Strip recommendation boilerplate so we keep the property cue. */
export function extractLikedDescription(raw: string): string {
  let text = raw.trim();
  text = text.replace(
    /\b(find|show|get|give)\s+(me\s+)?(similar|comparable|related)\s+(ones?|homes?|listings?|properties)?\b/gi,
    " ",
  );
  text = text.replace(
    /\b(recommend|recommendations?|similar\s+to|homes?\s+like|listings?\s+like|properties\s+like)\b/gi,
    " ",
  );
  text = text.replace(/\b(i\s+)?(really\s+)?(like|love|want)\b/gi, " ");
  text = text.replace(/\b(this|that|the)\s+(property|listing|home|house)\b/gi, " ");
  text = text.replace(/\b(please|thanks|thank you)\b/gi, " ");
  text = text.replace(/[?!.,]+/g, " ").replace(/\s+/g, " ").trim();
  return text;
}

interface DbListingRow {
  L_ListingID: string;
  L_DisplayId: string | null;
  L_Address: string | null;
  L_City: string | null;
  L_Zip: string | null;
  L_Type_: string | null;
  L_SystemPrice: number | null;
  L_Keyword2: number | null;
  LM_Dec_3: number | null;
  LM_Int2_3: number | null;
  YearBuilt: number | null;
  PhotoCount: number | null;
}

function rowToCached(row: DbListingRow): CachedListingEmbedding {
  return {
    id: row.L_ListingID,
    card: {
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
    },
    embedding: [],
  };
}

function pickCachedOrRow(
  rows: DbListingRow[],
  cacheById: Map<string, CachedListingEmbedding>,
): CachedListingEmbedding | null {
  if (rows.length === 0) return null;
  for (const row of rows) {
    const cached = cacheById.get(row.L_ListingID);
    if (cached) return cached;
  }
  return rowToCached(rows[0]);
}

async function findTargetByAddress(
  description: string,
  cacheById: Map<string, CachedListingEmbedding>,
): Promise<CachedListingEmbedding | null> {
  const cleaned = description.trim();
  if (cleaned.length < 4) return null;

  // Prefer queries that look like an address (street number present).
  const hasStreetNumber = /\b\d{1,6}\b/.test(cleaned);
  if (!hasStreetNumber && cleaned.split(/\s+/).length < 2) return null;

  const withoutIn = cleaned.replace(/\bin\b/gi, " ").replace(/\s+/g, " ").trim();
  const inMatch = cleaned.match(/^(.+?)\s+in\s+(.+)$/i);
  const streetHint = inMatch?.[1]?.trim() ?? withoutIn;
  const cityHint = inMatch?.[2]?.trim() ?? null;

  if (cityHint && streetHint) {
    const byParts = await query<DbListingRow>(
      `
SELECT
  L_ListingID, L_DisplayId, L_Address, L_City, L_Zip, L_Type_,
  L_SystemPrice, L_Keyword2, LM_Dec_3, LM_Int2_3, YearBuilt, PhotoCount
FROM rets_property
WHERE L_Status = 'Active'
  AND L_Address LIKE ?
  AND L_City LIKE ?
ORDER BY L_ListingID
LIMIT 10
`,
      [`%${streetHint}%`, `%${cityHint}%`],
    );
    const hit = pickCachedOrRow(byParts, cacheById);
    if (hit) return hit;
  }

  const rows = await query<DbListingRow>(
    `
SELECT
  L_ListingID, L_DisplayId, L_Address, L_City, L_Zip, L_Type_,
  L_SystemPrice, L_Keyword2, LM_Dec_3, LM_Int2_3, YearBuilt, PhotoCount
FROM rets_property
WHERE L_Status = 'Active'
  AND (
    CONCAT_WS(' ', L_Address, L_City, L_Zip) LIKE ?
    OR CONCAT_WS(' ', L_Address, L_City, L_Zip) LIKE ?
    OR L_Address LIKE ?
    OR L_Address LIKE ?
    OR L_DisplayId = ?
  )
ORDER BY L_ListingID
LIMIT 10
`,
    [`%${cleaned}%`, `%${withoutIn}%`, `%${cleaned}%`, `%${streetHint}%`, cleaned],
  );

  return pickCachedOrRow(rows, cacheById);
}

async function findTargetBySemantic(
  description: string,
  listings: CachedListingEmbedding[],
): Promise<CachedListingEmbedding | null> {
  if (!description || listings.length === 0) return null;
  const queryVec = await getEmbedding(description, "RETRIEVAL_QUERY");
  let best: CachedListingEmbedding | null = null;
  let bestScore = -Infinity;
  for (const item of listings) {
    const score = cosineSimilarity(queryVec, item.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

/** Resolve free-text “I like …” into one active listing (address first, else semantic). */
export async function resolveLikedListing(rawQuery: string): Promise<ResolvedTarget> {
  const description = extractLikedDescription(rawQuery) || rawQuery.trim();
  if (!description) {
    throw new Error(
      'Could not tell which property you like. Try: npm run recommend -- "I like 257 Fay Way in Mountain View"',
    );
  }

  const cache = loadEmbeddingCache();
  const cacheById = new Map(cache.listings.map((item) => [item.id, item]));

  const byAddress = await findTargetByAddress(description, cacheById);
  if (byAddress) {
    if (byAddress.embedding.length) {
      return { id: byAddress.id, source: "address", description, listing: byAddress };
    }
    // Address hit outside cache: embed once so hybrid scoring still works.
    const text = buildListingEmbeddingText({
      L_ListingID: byAddress.id,
      L_DisplayId: byAddress.card.displayId,
      L_Address: byAddress.card.address,
      L_City: byAddress.card.city,
      L_Zip: byAddress.card.zip,
      L_Type_: byAddress.card.type,
      L_SystemPrice: byAddress.card.price,
      L_Keyword2: byAddress.card.beds,
      LM_Dec_3: byAddress.card.baths,
      LM_Int2_3: byAddress.card.sqft,
      YearBuilt: byAddress.card.yearBuilt,
      L_Remarks: description,
      PhotoCount: byAddress.card.photoCount,
    });
    const embedding = await getEmbedding(text, "RETRIEVAL_DOCUMENT");
    return {
      id: byAddress.id,
      source: "address",
      description,
      listing: { ...byAddress, embedding },
    };
  }

  const bySemantic = await findTargetBySemantic(description, cache.listings);
  if (bySemantic) {
    return { id: bySemantic.id, source: "semantic", description, listing: bySemantic };
  }

  throw new Error(
    `No matching active listing found for "${description}". Ensure the Week 6 embedding cache is built.`,
  );
}
