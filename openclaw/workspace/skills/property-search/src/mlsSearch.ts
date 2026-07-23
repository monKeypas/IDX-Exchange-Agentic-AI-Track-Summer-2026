import { query } from "./mysql.js";
import { parsePropertyQuery, type PropertyFilters } from "./parsePropertyQuery.js";

export type { PropertyFilters };

/** Flip to true to include california_sold comps in search:mls. */
export const INCLUDE_SOLD_COMPS = false;

function ynClause(column: string, value: boolean): string {
  return value
    ? ` AND (${column} = 'True' OR ${column} = '1' OR ${column} = 'Yes')`
    : ` AND (${column} IS NULL OR ${column} = '' OR ${column} = '0' OR ${column} = 'False' OR ${column} = 'No')`;
}

function appendPropertyFilterClauses(filters: PropertyFilters, params: unknown[]): string {
  let sql = "";

  if (filters.city) {
    sql += " AND L_City = ?";
    params.push(filters.city);
  }
  if (filters.zip) {
    sql += " AND L_Zip = ?";
    params.push(filters.zip);
  }
  if (filters.state) {
    sql += " AND L_State = ?";
    params.push(filters.state);
  }
  if (filters.county) {
    sql += " AND CountyOrParish LIKE ?";
    params.push(`%${filters.county}%`);
  }
  if (filters.subdivision) {
    sql += " AND SubdivisionName LIKE ?";
    params.push(`%${filters.subdivision}%`);
  }
  if (filters.minPrice != null) {
    sql += " AND L_SystemPrice >= ?";
    params.push(filters.minPrice);
  }
  if (filters.maxPrice != null) {
    sql += " AND L_SystemPrice <= ?";
    params.push(filters.maxPrice);
  }
  if (filters.bedsMin != null && filters.bedsMax != null && filters.bedsMin === filters.bedsMax) {
    sql += " AND L_Keyword2 = ?";
    params.push(filters.bedsMin);
  } else {
    if (filters.bedsMin != null) {
      sql += " AND L_Keyword2 >= ?";
      params.push(filters.bedsMin);
    }
    if (filters.bedsMax != null) {
      sql += " AND L_Keyword2 <= ?";
      params.push(filters.bedsMax);
    }
  }
  if (filters.bathsMin != null) {
    sql += " AND LM_Dec_3 >= ?";
    params.push(filters.bathsMin);
  }
  if (filters.sqftMin != null) {
    sql += " AND LM_Int2_3 >= ?";
    params.push(filters.sqftMin);
  }
  if (filters.lotSqftMin != null) {
    sql += " AND LotSizeSquareFeet >= ?";
    params.push(filters.lotSqftMin);
  }
  if (filters.type) {
    sql += " AND L_Type_ = ?";
    params.push(filters.type);
  }
  if (filters.yearBuiltMin != null) {
    sql += " AND YearBuilt >= ?";
    params.push(filters.yearBuiltMin);
  }
  if (filters.yearBuiltMax != null) {
    sql += " AND YearBuilt <= ?";
    params.push(filters.yearBuiltMax);
  }
  if (filters.newConstruction === true) sql += ynClause("NewConstructionYN", true);
  if (filters.pool === true) sql += ynClause("PoolPrivateYN", true);
  if (filters.view === true) sql += ynClause("ViewYN", true);
  if (filters.fireplace === true) sql += ynClause("FireplaceYN", true);
  if (filters.garage === true) sql += ynClause("GarageYN", true);
  if (filters.spa === true) sql += ynClause("SpaYN", true);
  if (filters.attachedGarage === true) sql += ynClause("AttachedGarageYN", true);
  if (filters.maxHoa != null) {
    sql += " AND AssociationFee <= ?";
    params.push(filters.maxHoa);
  }
  if (filters.highSchoolDistrict) {
    sql += " AND HighSchoolDistrict LIKE ?";
    params.push(`%${filters.highSchoolDistrict}%`);
  }
  if (filters.maxDaysOnMarket != null) {
    sql += " AND DaysOnMarket <= ?";
    params.push(filters.maxDaysOnMarket);
  }
  if (filters.keywords) {
    const term = filters.keywords.trim();
    sql += ` AND (
      MATCH(L_Remarks) AGAINST (? IN BOOLEAN MODE)
      OR View LIKE ?
      OR LotFeatures LIKE ?
      OR CommunityFeatures LIKE ?
    )`;
    params.push(`${term}*`, `%${term}%`, `%${term}%`, `%${term}%`);
  }

  return sql;
}

export interface ListingRow {
  L_ListingID: string;
  L_DisplayId: string | null;
  L_Address: string | null;
  L_City: string | null;
  L_Zip: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  type: string | null;
  status: string | null;
  lat: number | null;
  lng: number | null;
  YearBuilt: number | null;
  AssociationFee: number | null;
  DaysOnMarket: number | null;
  PoolPrivateYN: string | null;
  ViewYN: string | null;
  FireplaceYN: string | null;
  PhotoCount: number | null;
  LA1_UserFirstName: string | null;
  LA1_UserLastName: string | null;
  LO1_OrganizationName: string | null;
}

export interface SoldRow {
  ListingKey: string;
  UnparsedAddress: string | null;
  City: string | null;
  CloseDate: string;
  ClosePrice: number | null;
  OriginalListPrice: number | null;
  ListPrice: number | null;
  DaysOnMarket: number | null;
  BedroomsTotal: number | null;
  BathroomsTotalInteger: number | null;
  LivingArea: number | null;
  PropertyType: string | null;
  PropertySubType: string | null;
  YearBuilt: number | null;
  ListAgentFullName: string | null;
  ListOfficeName: string | null;
  BuyerOfficeName: string | null;
}

export interface PropertyCard {
  id: string;
  source: "active_listing" | "sold_comp";
  headline: string;
  location: string;
  price: string;
  facts: string[];
  badges: string[];
  agent: string | null;
  office: string | null;
  metadata: Record<string, string | number | null>;
}

export interface SearchResult {
  query: string;
  filters: PropertyFilters;
  pagination: { page: number; limit: number; offset: number };
  cards: PropertyCard[];
}

// --- Query builders ---

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface BuiltSql {
  sql: string;
  params: ReadonlyArray<unknown>;
}

export function normalizePagination(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
  const offset = (safePage - 1) * safeLimit;

  return { page: safePage, limit: safeLimit, offset };
}

export function buildActiveListingsQuery(
  filters: PropertyFilters,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
): BuiltSql {
  const { offset, limit: safeLimit } = normalizePagination(page, limit);

  let sql = `
SELECT
  L_ListingID, L_DisplayId, L_Address, L_City, L_Zip,
  L_SystemPrice AS price, L_Keyword2 AS beds, LM_Dec_3 AS baths,
  LM_Int2_3 AS sqft, L_Type_ AS type, L_Status AS status,
  LMD_MP_Latitude AS lat, LMD_MP_Longitude AS lng,
  YearBuilt, AssociationFee, DaysOnMarket,
  PoolPrivateYN, ViewYN, FireplaceYN, PhotoCount,
  LA1_UserFirstName, LA1_UserLastName, LO1_OrganizationName
FROM rets_property
WHERE L_Status = "Active"
`;

  const params: unknown[] = [];
  sql += appendPropertyFilterClauses(filters, params);

  // LIMIT/OFFSET are normalized integers and safe to inline.
  sql += ` ORDER BY L_SystemPrice ASC LIMIT ${safeLimit} OFFSET ${offset}`;

  return { sql, params };
}

export async function searchActiveListings(
  filters: PropertyFilters,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
) {
  const { page: safePage, limit: safeLimit, offset } = normalizePagination(page, limit);
  const { sql, params } = buildActiveListingsQuery(filters, safePage, safeLimit);
  const rows = await query<ListingRow>(sql, params);

  return {
    rows,
    pagination: { page: safePage, limit: safeLimit, offset },
  };
}

export function buildSoldCompsQuery(city: string, months = 12): BuiltSql {
  const safeMonths = Number.isFinite(months) ? Math.max(1, Math.floor(months)) : 12;

  const sql = `
SELECT
  ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
  OriginalListPrice, ListPrice, DaysOnMarket,
  BedroomsTotal, BathroomsTotalInteger, LivingArea,
  PropertyType, PropertySubType, YearBuilt,
  ListAgentFullName, ListOfficeName, BuyerOfficeName
FROM california_sold
WHERE City = ?
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
  AND PropertyType = "Residential"
ORDER BY CloseDate DESC
LIMIT 50
`;

  return { sql, params: [city, safeMonths] };
}

export async function getSoldComps(city: string, months = 12): Promise<SoldRow[]> {
  const { sql, params } = buildSoldCompsQuery(city, months);
  return query<SoldRow>(sql, params);
}

// --- Card formatting ---

function formatCurrency(amount: number | null): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

function buildAddress(address: string | null, city: string | null, zip: string | null): string {
  return [address, city, zip].filter(Boolean).join(", ") || "Address unavailable";
}

function formatActiveListingCards(rows: ListingRow[]): PropertyCard[] {
  return rows.map((row) => {
    const agentName = [row.LA1_UserFirstName, row.LA1_UserLastName].filter(Boolean).join(" ").trim();
    const badges = [
      row.PoolPrivateYN === "True" ? "Pool" : null,
      row.ViewYN === "True" ? "View" : null,
      row.FireplaceYN === "True" ? "Fireplace" : null,
      row.PhotoCount ? `${row.PhotoCount} photos` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      id: row.L_ListingID,
      source: "active_listing",
      headline: `${row.type ?? "Property"} in ${row.L_City ?? "Unknown City"}`,
      location: buildAddress(row.L_Address, row.L_City, row.L_Zip),
      price: formatCurrency(row.price),
      facts: [
        `${formatNumber(row.beds)} bd`,
        `${formatNumber(row.baths)} ba`,
        `${formatNumber(row.sqft)} sqft`,
        row.YearBuilt ? `Built ${row.YearBuilt}` : "Year built N/A",
        row.DaysOnMarket != null ? `${row.DaysOnMarket} DOM` : "DOM N/A",
      ],
      badges,
      agent: agentName || null,
      office: row.LO1_OrganizationName,
      metadata: {
        displayId: row.L_DisplayId,
        status: row.status,
        latitude: row.lat,
        longitude: row.lng,
        hoaFee: row.AssociationFee,
      },
    };
  });
}

function formatSoldCompCards(rows: SoldRow[]): PropertyCard[] {
  return rows.map((row) => ({
    id: row.ListingKey,
    source: "sold_comp",
    headline: `${row.PropertySubType ?? row.PropertyType ?? "Residential"} comp`,
    location: [row.UnparsedAddress, row.City].filter(Boolean).join(", ") || "Address unavailable",
    price: formatCurrency(row.ClosePrice),
    facts: [
      `${formatNumber(row.BedroomsTotal)} bd`,
      `${formatNumber(row.BathroomsTotalInteger)} ba`,
      `${formatNumber(row.LivingArea)} sqft`,
      row.YearBuilt ? `Built ${row.YearBuilt}` : "Year built N/A",
      row.DaysOnMarket != null ? `${row.DaysOnMarket} DOM` : "DOM N/A",
    ],
    badges: [row.CloseDate ? `Closed ${row.CloseDate}` : null].filter(
      (item): item is string => Boolean(item),
    ),
    agent: row.ListAgentFullName,
    office: row.ListOfficeName,
    metadata: {
      buyerOffice: row.BuyerOfficeName,
      listPrice: row.ListPrice,
      originalListPrice: row.OriginalListPrice,
      closeDate: row.CloseDate,
    },
  }));
}

// --- End-to-end search ---

export async function searchMlsData(
  queryText: string,
  options: { page?: number; limit?: number; includeSoldComps?: boolean; soldMonths?: number } = {},
): Promise<SearchResult> {
  const filters = await parsePropertyQuery(queryText);
  const activeResults = await searchActiveListings(filters, options.page ?? 1, options.limit ?? 10);
  const cards = formatActiveListingCards(activeResults.rows);

  if (options.includeSoldComps && filters.city) {
    const soldRows = await getSoldComps(filters.city, options.soldMonths ?? 12);
    cards.push(...formatSoldCompCards(soldRows));
  }

  return {
    query: queryText,
    filters,
    pagination: activeResults.pagination,
    cards,
  };
}
