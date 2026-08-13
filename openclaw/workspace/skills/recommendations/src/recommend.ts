import { loadEmbeddingCache } from "../../semantic-search/src/embeddingStore.js";
import { validateWithComps, type CompValidation } from "./comps.js";
import { calculateSimilarityScore, type HybridListingFields } from "./hybridScore.js";
import { resolveLikedListing, type ResolvedTarget } from "./resolveTarget.js";

export interface Recommendation {
  id: string;
  score: number;
  address: string;
  city: string | null;
  zip: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  photoCount: number | null;
  comps: CompValidation | null;
}

export interface RecommendResult {
  query: string;
  target: {
    id: string;
    source: ResolvedTarget["source"];
    address: string;
    city: string | null;
    price: number | null;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
  };
  recommendations: Recommendation[];
  reply: string;
}

function cardToFields(card: {
  price: number | null;
  beds: number | null;
  city: string | null;
  sqft: number | null;
}): HybridListingFields {
  return {
    L_SystemPrice: card.price,
    L_Keyword2: card.beds,
    L_City: card.city,
    LM_Int2_3: card.sqft,
  };
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAddress(address: string | null, city: string | null, zip: string | null): string {
  return [address, city, zip].filter(Boolean).join(", ") || "Address unavailable";
}

export function formatRecommendReply(
  target: RecommendResult["target"],
  recommendations: Recommendation[],
): string {
  const targetLine = [
    `Based on: ${target.address}`,
    target.price != null ? formatCurrency(target.price) : null,
    target.beds != null ? `${target.beds} bd` : null,
    target.sqft != null ? `${target.sqft} sqft` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (recommendations.length === 0) {
    return `${targetLine}\n\nNo similar active listings found.`;
  }

  const blocks = recommendations.map((rec, index) => {
    const beds = rec.beds != null ? `${rec.beds} bd` : "beds N/A";
    const baths = rec.baths != null ? `${rec.baths} ba` : "baths N/A";
    const photos = rec.photoCount != null ? `${rec.photoCount} photos` : "photos N/A";
    const lines = [
      `${index + 1}) ${rec.address}`,
      `${formatCurrency(rec.price)} · ${beds} / ${baths} · ${photos} · hybrid score ${rec.score}`,
    ];
    if (rec.comps) {
      const delta =
        rec.comps.deltaPct == null ? "n/a" : `${rec.comps.deltaPct > 0 ? "+" : ""}${rec.comps.deltaPct}%`;
      lines.push(
        `Comps: est. ${formatCurrency(rec.comps.compPrice)} from ${rec.comps.compCount} sales (6mo) · list vs comps ${delta}`,
      );
      lines.push(`Assessment: ${rec.comps.assessment}`);
    }
    return lines.join("\n");
  });

  return [
    "Top 5 hybrid recommendations",
    "",
    targetLine,
    `(matched via ${target.source})`,
    "",
    blocks.join("\n\n"),
  ].join("\n");
}

/** Free-text like → resolve target → hybrid top-5 + california_sold comps. */
export async function recommendSimilarListings(
  queryText: string,
  options: { topK?: number } = {},
): Promise<RecommendResult> {
  const topK = options.topK ?? 5;
  const text = queryText.trim();
  if (!text) {
    return {
      query: queryText,
      target: {
        id: "",
        source: "semantic",
        address: "",
        city: null,
        price: null,
        beds: null,
        baths: null,
        sqft: null,
      },
      recommendations: [],
      reply:
        'Usage: npm run recommend -- "I like 257 Fay Way in Mountain View, find similar homes"',
    };
  }

  const resolved = await resolveLikedListing(text);
  const target = resolved.listing;
  const targetFields = cardToFields(target.card);
  const cache = loadEmbeddingCache();

  const scored = cache.listings
    .filter((item) => item.id !== target.id && item.embedding.length > 0)
    .map((item) => ({
      item,
      score: calculateSimilarityScore(
        targetFields,
        cardToFields(item.card),
        target.embedding,
        item.embedding,
      ),
    }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(1, topK));

  const recommendations: Recommendation[] = [];
  for (const row of top) {
    const c = row.item.card;
    let comps: CompValidation | null = null;
    if (c.city && c.sqft != null && c.sqft > 0 && c.price != null) {
      comps = await validateWithComps(c.city, c.sqft, c.price);
    }
    recommendations.push({
      id: row.item.id,
      score: row.score,
      address: formatAddress(c.address, c.city, c.zip),
      city: c.city,
      zip: c.zip,
      price: c.price,
      beds: c.beds,
      baths: c.baths,
      sqft: c.sqft,
      photoCount: c.photoCount,
      comps,
    });
  }

  const targetSummary = {
    id: target.id,
    source: resolved.source,
    address: formatAddress(target.card.address, target.card.city, target.card.zip),
    city: target.card.city,
    price: target.card.price,
    beds: target.card.beds,
    baths: target.card.baths,
    sqft: target.card.sqft,
  };

  return {
    query: text,
    target: targetSummary,
    recommendations,
    reply: formatRecommendReply(targetSummary, recommendations),
  };
}
