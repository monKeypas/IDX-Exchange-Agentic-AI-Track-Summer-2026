export interface ParsedMarketQuery {
  city: string | null;
  zip: string | null;
  propertyType: string | null;
  months: number;
  intent: "summary" | "trend" | "ppsqft" | "dom" | "inventory" | "buy_timing";
}

function titleCaseWords(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function isValidCityName(city: string): boolean {
  return Boolean(city) && !/(bay area|california|so\s*cal|anywhere|any city)/i.test(city);
}

function detectIntent(text: string): ParsedMarketQuery["intent"] {
  const lower = text.toLowerCase();
  if (/good time to buy|should i buy|buyer.?s market|seller.?s market/i.test(lower)) {
    return "buy_timing";
  }
  if (/inventory|active listings|supply|how many.*for sale/i.test(lower)) return "inventory";
  if (/price per sq|ppsf|\$\/sq|per square/i.test(lower)) return "ppsqft";
  if (/days on market|\bdom\b|how long.*market/i.test(lower)) return "dom";
  if (/trend|over time|month.over.month|year.over.year|mom|yoy/i.test(lower)) return "trend";
  return "summary";
}

/** Parse market questions like "avg price per sq ft in Pasadena" or "good time to buy in San Diego?". */
export function parseMarketQuery(query: string): ParsedMarketQuery {
  const monthsMatch = query.match(/\b(\d+)\s*-?\s*month/i);
  const months = monthsMatch ? Math.min(60, Math.max(1, Number(monthsMatch[1]))) : 12;

  const zipMatch = query.match(/\b(?:zip(?:\s*code)?\s*)?(\d{5})\b/i);
  const zip = zipMatch?.[1] ?? null;

  let city: string | null = null;
  const inMatch = query.match(
    /\bin\s+([A-Za-z][A-Za-z\s.'-]+?)(?=\s*\?|$|\s+over|\s+last|\s+past|\s+for|\s+zip|\s+under)/i,
  );
  const forMatch = query.match(
    /\b(?:for|about)\s+([A-Za-z][A-Za-z\s.'-]+?)(?=\s*\?|$|\s+over|\s+last|\s+market)/i,
  );
  const rawCity = (inMatch?.[1] ?? forMatch?.[1] ?? "").trim();
  if (rawCity && isValidCityName(rawCity)) city = titleCaseWords(rawCity);

  // Bare city reply: "San Diego"
  if (!city) {
    const trimmed = query.trim().replace(/\?+$/, "");
    if (
      /^[A-Za-z][A-Za-z\s.'-]{1,40}$/.test(trimmed) &&
      !/(market|price|trend|buy|inventory|average|median|stats)/i.test(trimmed) &&
      isValidCityName(trimmed)
    ) {
      city = titleCaseWords(trimmed);
    }
  }

  let propertyType: string | null = null;
  const lower = query.toLowerCase();
  if (/\bcondo/i.test(lower)) propertyType = "Condominium";
  else if (/townhome|townhouse/i.test(lower)) propertyType = "Townhouse";
  else if (/single family|house|home/i.test(lower) && !/townhome|condo/i.test(lower)) {
    propertyType = "SingleFamilyResidence";
  }

  return {
    city,
    zip,
    propertyType,
    months,
    intent: detectIntent(query),
  };
}
