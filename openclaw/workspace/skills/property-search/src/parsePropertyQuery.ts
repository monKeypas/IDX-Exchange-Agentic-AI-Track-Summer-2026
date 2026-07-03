export interface ParsedPropertyQuery {
  city: string | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  type: string | null;
  pool: string | null;
  hasView: string | null;
}

/** Maps parsed filters to rets_property column names (Week 3 DB layer). */
export function toRetsFilters(parsed: ParsedPropertyQuery): Record<string, string | number> {
  const filters: Record<string, string | number> = {};

  if (parsed.city) filters.L_City = parsed.city;
  if (parsed.maxPrice != null) filters.L_SystemPrice = parsed.maxPrice;
  if (parsed.beds != null) filters.L_Keyword2 = parsed.beds;
  if (parsed.baths != null) filters.LM_Dec_3 = parsed.baths;
  if (parsed.sqft != null) filters.LM_Int2_3 = parsed.sqft;
  if (parsed.type) filters.L_Type_ = parsed.type;
  if (parsed.pool) filters.PoolPrivateYN = parsed.pool;
  if (parsed.hasView) filters.ViewYN = parsed.hasView;

  return filters;
}

export async function parsePropertyQuery(query: string): Promise<ParsedPropertyQuery> {
  const cityMatch = query.match(/in ([A-Za-z\s]+?)(?:\s+under|\s+with|\s+at|$)/i);
  const priceMatch = query.match(/under \$?([\d,.]+)(k|m)?/i);
  const bedsMatch = query.match(/(\d+)[\s-]*(bed|beds|bedroom|bedrooms)/i);
  const bathsMatch = query.match(/(\d+(?:\.5)?)[\s-]*(bath|baths|bathroom)/i);
  const sqftMatch = query.match(/(\d+)[\s,]*(sqft|sq ft|square feet)/i);
  const poolMatch = /pool/i.test(query);
  const viewMatch = /view/i.test(query);

  const typeMap: Record<string, string> = {
    condo: "Condominium",
    townhome: "Townhouse",
    "single family": "SingleFamilyResidence",
    land: "UnimprovedLand",
  };

  const typeKey = Object.keys(typeMap).find((k) => query.toLowerCase().includes(k));

  let maxPrice: number | null = null;
  if (priceMatch) {
    maxPrice = Number(priceMatch[1].replace(/,/g, ""));
    if (priceMatch[2]?.toLowerCase() === "k") maxPrice *= 1000;
    if (priceMatch[2]?.toLowerCase() === "m") maxPrice *= 1_000_000;
  }

  return {
    city: cityMatch?.[1]?.trim() || null,
    maxPrice,
    beds: bedsMatch ? Number(bedsMatch[1]) : null,
    baths: bathsMatch ? Number(bathsMatch[1]) : null,
    sqft: sqftMatch ? Number(sqftMatch[1]) : null,
    type: typeKey ? typeMap[typeKey] : null,
    pool: poolMatch ? "True" : null,
    hasView: viewMatch ? "True" : null,
  };
}
