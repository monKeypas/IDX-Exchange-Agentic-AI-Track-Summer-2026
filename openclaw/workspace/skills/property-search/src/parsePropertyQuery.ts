import { emptyPropertyFilters, type PropertyFilters } from "./propertyFilters.js";

export type ParsedPropertyQuery = PropertyFilters;

function titleCaseWords(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function parseMoneyAmount(raw: string, unit?: string): number | null {
  let amount = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  const u = (unit ?? "").toLowerCase();
  if (u === "k" || u === "thousand") amount *= 1000;
  if (u === "m" || u === "million") amount *= 1_000_000;
  if (u === "billion") amount *= 1_000_000_000;
  return amount;
}

function parseBetweenRange(text: string): { min: number | null; max: number | null } {
  const between = text.match(
    /between\s+\$?\s*([\d,.]+)\s*(k|m|thousand|million|billion)?\s+and\s+\$?\s*([\d,.]+)\s*(k|m|thousand|million|billion)?/i,
  );
  if (!between) return { min: null, max: null };

  const sharedUnit = between[4] ?? between[2] ?? undefined;
  return {
    min: parseMoneyAmount(between[1], between[2] ?? sharedUnit),
    max: parseMoneyAmount(between[3], between[4] ?? sharedUnit),
  };
}

/** Parse budgets like under $1.5M, 800k, 3 million. */
export function parseMaxPrice(text: string): number | null {
  const range = parseBetweenRange(text);
  if (range.max != null) return range.max;

  const underMatch = text.match(
    /(?:under|below|max|up to)\s+\$?\s*([\d,.]+)\s*(k|m|thousand|million|billion)?\b/i,
  );
  const plainMatch = text.match(/\$?\s*([\d,.]+)\s*(k|m|thousand|million|billion)\b/i);
  const match = underMatch ?? plainMatch;
  if (!match) return null;
  return parseMoneyAmount(match[1], match[2] ?? undefined);
}

export function parseMinPrice(text: string): number | null {
  const range = parseBetweenRange(text);
  if (range.min != null) return range.min;

  const minMatch = text.match(
    /(?:over|above|at least|minimum|min|more than)\s+\$?\s*([\d,.]+)\s*(k|m|thousand|million|billion)?\b/i,
  );
  if (!minMatch) return null;
  return parseMoneyAmount(minMatch[1], minMatch[2] ?? undefined);
}

function isValidCityName(city: string): boolean {
  return Boolean(city) && !/(bay area|any city|california|so\s*cal)/i.test(city);
}

/** Maps parsed filters to rets_property column names (legacy Week 2 helper). */
export function toRetsFilters(parsed: PropertyFilters): Record<string, string | number> {
  const filters: Record<string, string | number> = {};
  if (parsed.city) filters.L_City = parsed.city;
  if (parsed.zip) filters.L_Zip = parsed.zip;
  if (parsed.maxPrice != null) filters.L_SystemPrice = parsed.maxPrice;
  if (parsed.minPrice != null) filters.minPrice = parsed.minPrice;
  if (parsed.bedsMin != null) filters.L_Keyword2 = parsed.bedsMin;
  if (parsed.bathsMin != null) filters.LM_Dec_3 = parsed.bathsMin;
  if (parsed.sqftMin != null) filters.LM_Int2_3 = parsed.sqftMin;
  if (parsed.type) filters.L_Type_ = parsed.type;
  if (parsed.pool) filters.PoolPrivateYN = "True";
  if (parsed.view) filters.ViewYN = "True";
  return filters;
}

export async function parsePropertyQuery(query: string): Promise<PropertyFilters> {
  const filters = emptyPropertyFilters();
  const lower = query.toLowerCase();

  const cityMatch = query.match(
    /\bin\s+([A-Za-z][A-Za-z\s.'-]+?)(?=\s+(?:under|with|at|zip|built|hoa|between)|$)/i,
  );
  if (cityMatch?.[1] && isValidCityName(cityMatch[1].trim())) {
    filters.city = titleCaseWords(cityMatch[1]);
  }

  const zipMatch = query.match(/\b(?:zip(?:\s*code)?\s*)?(\d{5})\b/i);
  if (zipMatch) filters.zip = zipMatch[1];

  filters.minPrice = parseMinPrice(query);
  filters.maxPrice = parseMaxPrice(query);

  const exactBeds = query.match(/(?:exactly|only)\s+(\d+)[\s-]*(?:bed|beds|bedroom)/i);
  const bedsMatch = query.match(/(\d+)[\s-]*(?:bed|beds|bedroom|bedrooms)/i);
  if (exactBeds) {
    filters.bedsMin = Number(exactBeds[1]);
    filters.bedsMax = Number(exactBeds[1]);
  } else if (bedsMatch) {
    filters.bedsMin = Number(bedsMatch[1]);
  }

  const bathsMatch = query.match(/(\d+(?:\.5)?)\s*(?:bath|baths|bathroom|bathrooms)/i);
  if (bathsMatch) filters.bathsMin = Number(bathsMatch[1]);

  const sqftMatch = query.match(/(\d[\d,]*)\s*(?:sqft|sq ft|square feet)/i);
  if (sqftMatch) filters.sqftMin = Number(sqftMatch[1].replace(/,/g, ""));

  const lotMatch = query.match(/(\d[\d,]*)\s*(?:sqft|sq ft|square feet)\s+lot/i);
  if (lotMatch) filters.lotSqftMin = Number(lotMatch[1].replace(/,/g, ""));

  const typeMap: Record<string, string> = {
    condo: "Condominium",
    townhome: "Townhouse",
    "single family": "SingleFamilyResidence",
    land: "UnimprovedLand",
    duplex: "Duplex",
  };
  const typeKey = Object.keys(typeMap).find((k) => lower.includes(k));
  if (typeKey) filters.type = typeMap[typeKey];

  const yearAfter = query.match(/(?:built|year)\s+(?:after|since|from)\s+(\d{4})/i);
  const yearBefore = query.match(/(?:built|year)\s+before\s+(\d{4})/i);
  if (yearAfter) filters.yearBuiltMin = Number(yearAfter[1]);
  if (yearBefore) filters.yearBuiltMax = Number(yearBefore[1]);

  if (/new construction|brand new|newly built/i.test(query)) filters.newConstruction = true;
  if (/pool/i.test(query)) filters.pool = true;
  if (/view/i.test(query)) filters.view = true;
  if (/fireplace/i.test(query)) filters.fireplace = true;
  if (/garage/i.test(query)) filters.garage = true;
  if (/\bspa\b/i.test(query)) filters.spa = true;
  if (/attached garage/i.test(query)) filters.attachedGarage = true;

  const hoaMatch = query.match(/hoa\s*(?:under|below|max)?\s*\$?\s*([\d,.]+)/i);
  if (hoaMatch) filters.maxHoa = Number(hoaMatch[1].replace(/,/g, ""));

  const schoolMatch = query.match(/(?:in\s+)?([A-Za-z0-9\s.'-]+?)\s+(?:school district|schools)/i);
  if (schoolMatch) filters.highSchoolDistrict = schoolMatch[1].trim();

  const subdivisionMatch = query.match(/(?:in\s+)?([A-Za-z0-9\s.'-]+?)\s+subdivision/i);
  if (subdivisionMatch) filters.subdivision = subdivisionMatch[1].trim();

  const countyMatch = query.match(/(?:in\s+)?([A-Za-z\s.'-]+?)\s+county/i);
  if (countyMatch) filters.county = titleCaseWords(countyMatch[1]);

  if (/\bCA\b|california\b/i.test(query)) filters.state = "CA";

  const domMatch = query.match(/(?:on market|dom)\s*(?:under|less than|<=)?\s*(\d+)\s*days?/i);
  if (domMatch) filters.maxDaysOnMarket = Number(domMatch[1]);

  const keywordHints = [
    "waterfront",
    "river",
    "creek",
    "lake",
    "ocean",
    "mountain",
    "golf",
  ];
  const keyword = keywordHints.find((k) => lower.includes(k));
  if (keyword) filters.keywords = keyword;

  return filters;
}

/** Merge non-null parsed fields into an existing filter set (session updates). */
export function mergePropertyFilters(
  base: Partial<PropertyFilters>,
  parsed: PropertyFilters,
): Partial<PropertyFilters> {
  const merged: Partial<PropertyFilters> = { ...base };
  for (const [key, value] of Object.entries(parsed) as [keyof PropertyFilters, unknown][]) {
    if (value == null) continue;
    if (typeof value === "boolean" && value === false) continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}
