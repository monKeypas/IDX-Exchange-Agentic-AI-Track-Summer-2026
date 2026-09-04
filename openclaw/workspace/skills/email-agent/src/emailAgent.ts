import { answerMarketQuestion } from "../../market-stats/src/marketStats.js";
import { parsePropertyQuery } from "../../property-search/src/parsePropertyQuery.js";
import { searchActiveListings } from "../../property-search/src/mlsSearch.js";
import { recommendSimilarListings } from "../../recommendations/src/recommend.js";
import { draftEmail } from "./draftEmail.js";
import { saveDraft } from "./draftStore.js";
import { clampRows, MAX_ROWS_PER_QUERY } from "./guardrails.js";
import {
  listingAlertHtml,
  propertySummaryHtml,
  recommendationDigestHtml,
  weeklyMarketReportHtml,
  type ListingCardInput,
} from "./templates.js";
import type { DraftResult } from "./types.js";

function asCards(rows: Array<Record<string, unknown>>): ListingCardInput[] {
  return clampRows(rows).map((r) => ({
    L_Address: (r.L_Address as string) ?? null,
    L_City: (r.L_City as string) ?? null,
    L_Zip: (r.L_Zip as string) ?? null,
    price: (r.price as number) ?? null,
    beds: (r.beds as number) ?? null,
    baths: (r.baths as number) ?? null,
    sqft: (r.sqft as number) ?? null,
    PhotoCount: (r.PhotoCount as number) ?? null,
    DaysOnMarket: (r.DaysOnMarket as number) ?? null,
    type: (r.type as string) ?? null,
  }));
}

/** New listing alerts matching a saved search (rets_property). */
export async function draftListingAlert(opts: {
  to: string;
  query: string;
}): Promise<DraftResult> {
  const filters = await parsePropertyQuery(opts.query);
  const { rows } = await searchActiveListings(filters, 1, MAX_ROWS_PER_QUERY);
  const listings = asCards(rows as unknown as Array<Record<string, unknown>>);
  const body = listingAlertHtml({ searchLabel: opts.query, listings });
  const result = await draftEmail(
    opts.to,
    `New listings: ${opts.query}`.slice(0, 120),
    body,
    "listing_alert",
    { query: opts.query, count: listings.length },
  );
  saveDraft(result.draft);
  return result;
}

/** Weekly market report from california_sold analytics. */
export async function draftWeeklyMarketReport(opts: {
  to: string;
  city: string;
}): Promise<DraftResult> {
  const report = await answerMarketQuestion(`Weekly market report for ${opts.city}`);
  const summary = report.summary;
  const trendLines = report.trends.slice(-6).map((t) => {
    const change =
      t.priceChangePct != null
        ? ` (${t.priceChangePct > 0 ? "+" : ""}${t.priceChangePct}%)`
        : "";
    return `${t.month}: avg ${t.avgPrice != null ? `$${Math.round(t.avgPrice).toLocaleString()}` : "N/A"} · ${t.sales} sales${change}`;
  });

  const body = weeklyMarketReportHtml({
    city: opts.city,
    months: report.parsed.months,
    soldCount: summary?.soldCount ?? null,
    medianClose: summary?.medianClosePrice ?? null,
    avgClose: summary?.avgClosePrice ?? null,
    avgPpsf: summary?.avgPricePerSqft ?? null,
    avgDom: summary?.avgDom ?? null,
    listToClosePct: summary?.listToClosePct ?? null,
    activeListings: report.inventory?.activeListings ?? null,
    monthsOfInventory: report.inventory?.monthsOfInventory ?? null,
    trendLines,
  });

  const result = await draftEmail(
    opts.to,
    `Weekly market report — ${opts.city}`,
    body,
    "market_report",
    { city: opts.city },
  );
  saveDraft(result.draft);
  return result;
}

/** Property summary card (address, photos, price, comps note). */
export async function draftPropertySummary(opts: {
  to: string;
  query: string;
}): Promise<DraftResult> {
  const filters = await parsePropertyQuery(opts.query);
  const { rows } = await searchActiveListings(filters, 1, 1);
  const listing = asCards(rows as unknown as Array<Record<string, unknown>>)[0];
  if (!listing) {
    const result = await draftEmail(
      opts.to,
      `Property summary — no match`,
      propertySummaryHtml({
        listing: { L_Address: opts.query, L_City: null },
        compsNote: "No active listing matched that query.",
      }),
      "property_summary",
    );
    saveDraft(result.draft);
    return result;
  }

  const body = propertySummaryHtml({
    listing,
    compsNote: "See Week 5/7 tools for sold-comp detail on this address.",
  });
  const result = await draftEmail(
    opts.to,
    `Property summary — ${listing.L_Address}, ${listing.L_City}`,
    body,
    "property_summary",
    { query: opts.query },
  );
  saveDraft(result.draft);
  return result;
}

/** Personalized recommendation digest. */
export async function draftRecommendationDigest(opts: {
  to: string;
  query: string;
}): Promise<DraftResult> {
  const rec = await recommendSimilarListings(opts.query, { topK: 5 });
  const listings: ListingCardInput[] = clampRows(rec.recommendations).map((r) => ({
    L_Address: r.address,
    L_City: r.city,
    L_Zip: r.zip,
    price: r.price,
    beds: r.beds,
    baths: r.baths,
    sqft: r.sqft,
    PhotoCount: r.photoCount,
  }));

  const body = recommendationDigestHtml({
    intro: `Recommendations based on: ${opts.query}`,
    listings,
  });

  const result = await draftEmail(
    opts.to,
    "Homes you may like — recommendation digest",
    body,
    "recommendation_digest",
    { query: opts.query, count: listings.length },
  );
  saveDraft(result.draft);
  return result;
}
