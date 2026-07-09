import { query } from "./mysql.js";
import type { ListingRow, PropertyFilters, SoldRow } from "./mlsTypes.js";

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
  const { offset, page: safePage, limit: safeLimit } = normalizePagination(page, limit);

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

  if (filters.city) {
    sql += " AND L_City = ?";
    params.push(filters.city);
  }
  if (filters.maxPrice != null) {
    sql += " AND L_SystemPrice <= ?";
    params.push(filters.maxPrice);
  }
  if (filters.beds != null) {
    sql += " AND L_Keyword2 >= ?";
    params.push(filters.beds);
  }
  if (filters.baths != null) {
    sql += " AND LM_Dec_3 >= ?";
    params.push(filters.baths);
  }
  if (filters.sqft != null) {
    sql += " AND LM_Int2_3 >= ?";
    params.push(filters.sqft);
  }
  if (filters.type) {
    sql += " AND L_Type_ = ?";
    params.push(filters.type);
  }
  if (filters.pool) {
    sql += " AND PoolPrivateYN = ?";
    params.push(filters.pool);
  }
  if (filters.hasView) {
    sql += " AND ViewYN = ?";
    params.push(filters.hasView);
  }

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
    pagination: {
      page: safePage,
      limit: safeLimit,
      offset,
    },
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
