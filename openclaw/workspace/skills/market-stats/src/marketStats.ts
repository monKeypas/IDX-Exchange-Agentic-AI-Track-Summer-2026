import { query } from "./mysql.js";
import { parseMarketQuery, type ParsedMarketQuery } from "./parseMarketQuery.js";

export interface MarketSummary {
  city: string;
  zip: string | null;
  months: number;
  soldCount: number;
  avgClosePrice: number | null;
  medianClosePrice: number | null;
  avgPricePerSqft: number | null;
  avgDom: number | null;
  listToClosePct: number | null;
}

export interface MonthlyTrendRow {
  month: string;
  sales: number;
  avgPrice: number | null;
  avgDom: number | null;
  priceChangePct: number | null;
}

export interface InventoryComparison {
  city: string;
  activeListings: number;
  soldLast12Months: number;
  monthsOfInventory: number | null;
}

export interface YoYComparison {
  recentAvgPrice: number | null;
  priorAvgPrice: number | null;
  priceChangePct: number | null;
  recentAvgDom: number | null;
  priorAvgDom: number | null;
  recentSoldCount: number;
  priorSoldCount: number;
}

export interface MarketReport {
  query: string;
  parsed: ParsedMarketQuery;
  summary: MarketSummary | null;
  trends: MonthlyTrendRow[];
  yoy: YoYComparison | null;
  inventory: InventoryComparison | null;
  reply: string;
}

export interface BuiltSql {
  sql: string;
  params: ReadonlyArray<unknown>;
}

function locationClause(
  filters: { city?: string | null; zip?: string | null },
  params: unknown[],
  cityColumn = "City",
  zipColumn = "PostalCode",
): string {
  let sql = "";
  if (filters.city) {
    sql += ` AND ${cityColumn} = ?`;
    params.push(filters.city);
  }
  if (filters.zip) {
    sql += ` AND ${zipColumn} = ?`;
    params.push(filters.zip);
  }
  return sql;
}

function subtypeClause(propertyType: string | null, params: unknown[]): string {
  if (!propertyType) return "";
  params.push(propertyType);
  return " AND PropertySubType = ?";
}

export function buildCitySummaryQuery(
  city: string,
  options: { months?: number; zip?: string | null; propertyType?: string | null } = {},
): BuiltSql {
  const months = options.months ?? 12;
  const params: unknown[] = [months];
  let sql = `
SELECT
  COUNT(*) AS sold_count,
  ROUND(AVG(ClosePrice), 0) AS avg_close_price,
  ROUND(AVG(ClosePrice / NULLIF(LivingArea, 0)), 0) AS avg_price_per_sqft,
  ROUND(AVG(DaysOnMarket), 1) AS avg_dom,
  ROUND(AVG(ClosePrice / NULLIF(ListPrice, 0)) * 100, 1) AS list_to_close_pct
FROM california_sold
WHERE PropertyType = 'Residential'
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
  AND CloseDate <= CURDATE()
  AND LivingArea > 0
  AND ClosePrice > 0
`;
  sql += locationClause({ city, zip: options.zip ?? null }, params);
  sql += subtypeClause(options.propertyType ?? null, params);
  return { sql, params };
}

export function buildMonthlyTrendQuery(
  city: string,
  options: { months?: number; zip?: string | null; propertyType?: string | null } = {},
): BuiltSql {
  const months = options.months ?? 12;
  const params: unknown[] = [months];
  let sql = `
SELECT
  DATE_FORMAT(CloseDate, '%Y-%m') AS month,
  COUNT(*) AS sales,
  ROUND(AVG(ClosePrice), 0) AS avg_price,
  ROUND(AVG(DaysOnMarket), 1) AS avg_dom
FROM california_sold
WHERE PropertyType = 'Residential'
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
  AND CloseDate <= CURDATE()
  AND ClosePrice > 0
`;
  sql += locationClause({ city, zip: options.zip ?? null }, params);
  sql += subtypeClause(options.propertyType ?? null, params);
  sql += `
GROUP BY DATE_FORMAT(CloseDate, '%Y-%m')
ORDER BY month
`;
  return { sql, params };
}

export function buildMedianPriceQuery(
  city: string,
  options: { months?: number; zip?: string | null; propertyType?: string | null; offset?: number } = {},
): BuiltSql {
  const months = options.months ?? 12;
  const offset = Math.max(0, options.offset ?? 0);
  const params: unknown[] = [months];
  let sql = `
SELECT ClosePrice AS median_close_price
FROM california_sold
WHERE PropertyType = 'Residential'
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
  AND CloseDate <= CURDATE()
  AND LivingArea > 0
  AND ClosePrice > 0
`;
  sql += locationClause({ city, zip: options.zip ?? null }, params);
  sql += subtypeClause(options.propertyType ?? null, params);
  // OFFSET/LIMIT are normalized integers and safe to inline.
  sql += ` ORDER BY ClosePrice ASC LIMIT 1 OFFSET ${offset}`;
  return { sql, params };
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getCityMarketSummary(
  city: string,
  options: { months?: number; zip?: string | null; propertyType?: string | null } = {},
): Promise<MarketSummary | null> {
  const months = options.months ?? 12;
  const { sql, params } = buildCitySummaryQuery(city, options);
  const rows = await query<{
    sold_count: number;
    avg_close_price: number | null;
    avg_price_per_sqft: number | null;
    avg_dom: number | null;
    list_to_close_pct: number | null;
  }>(sql, params);

  const row = rows[0];
  const soldCount = Number(row?.sold_count ?? 0);
  if (!row || soldCount === 0) return null;

  const medianOffset = Math.floor((soldCount - 1) / 2);
  const medianSql = buildMedianPriceQuery(city, { ...options, offset: medianOffset });
  const medianRows = await query<{ median_close_price: number | null }>(
    medianSql.sql,
    medianSql.params,
  );

  return {
    city,
    zip: options.zip ?? null,
    months,
    soldCount,
    avgClosePrice: toNumber(row.avg_close_price),
    medianClosePrice: toNumber(medianRows[0]?.median_close_price),
    avgPricePerSqft: toNumber(row.avg_price_per_sqft),
    avgDom: toNumber(row.avg_dom),
    listToClosePct: toNumber(row.list_to_close_pct),
  };
}

export async function getMonthlyTrends(
  city: string,
  options: { months?: number; zip?: string | null; propertyType?: string | null } = {},
): Promise<MonthlyTrendRow[]> {
  const { sql, params } = buildMonthlyTrendQuery(city, options);
  const rows = await query<{
    month: string;
    sales: number;
    avg_price: number | null;
    avg_dom: number | null;
  }>(sql, params);

  return rows.map((row, index) => {
    const avgPrice = toNumber(row.avg_price);
    const prev = index > 0 ? toNumber(rows[index - 1].avg_price) : null;
    const priceChangePct =
      avgPrice != null && prev != null && prev !== 0
        ? Number((((avgPrice - prev) / prev) * 100).toFixed(1))
        : null;
    return {
      month: row.month,
      sales: Number(row.sales),
      avgPrice,
      avgDom: toNumber(row.avg_dom),
      priceChangePct,
    };
  });
}

export async function getYoYComparison(
  city: string,
  options: { zip?: string | null; propertyType?: string | null } = {},
): Promise<YoYComparison> {
  const paramsRecent: unknown[] = [];
  let recentSql = `
SELECT
  COUNT(*) AS sold_count,
  ROUND(AVG(ClosePrice), 0) AS avg_price,
  ROUND(AVG(DaysOnMarket), 1) AS avg_dom
FROM california_sold
WHERE PropertyType = 'Residential'
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
  AND CloseDate <= CURDATE()
  AND ClosePrice > 0
`;
  recentSql += locationClause({ city, zip: options.zip ?? null }, paramsRecent);
  recentSql += subtypeClause(options.propertyType ?? null, paramsRecent);

  const paramsPrior: unknown[] = [];
  let priorSql = `
SELECT
  COUNT(*) AS sold_count,
  ROUND(AVG(ClosePrice), 0) AS avg_price,
  ROUND(AVG(DaysOnMarket), 1) AS avg_dom
FROM california_sold
WHERE PropertyType = 'Residential'
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
  AND CloseDate < DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
  AND ClosePrice > 0
`;
  priorSql += locationClause({ city, zip: options.zip ?? null }, paramsPrior);
  priorSql += subtypeClause(options.propertyType ?? null, paramsPrior);

  const [recent] = await query<{
    sold_count: number;
    avg_price: number | null;
    avg_dom: number | null;
  }>(recentSql, paramsRecent);
  const [prior] = await query<{
    sold_count: number;
    avg_price: number | null;
    avg_dom: number | null;
  }>(priorSql, paramsPrior);

  const recentAvgPrice = toNumber(recent?.avg_price);
  const priorAvgPrice = toNumber(prior?.avg_price);
  const priceChangePct =
    recentAvgPrice != null && priorAvgPrice != null && priorAvgPrice !== 0
      ? Number((((recentAvgPrice - priorAvgPrice) / priorAvgPrice) * 100).toFixed(1))
      : null;

  return {
    recentAvgPrice,
    priorAvgPrice,
    priceChangePct,
    recentAvgDom: toNumber(recent?.avg_dom),
    priorAvgDom: toNumber(prior?.avg_dom),
    recentSoldCount: Number(recent?.sold_count ?? 0),
    priorSoldCount: Number(prior?.sold_count ?? 0),
  };
}

export async function getInventoryComparison(city: string): Promise<InventoryComparison> {
  const [active] = await query<{ active_count: number }>(
    `SELECT COUNT(*) AS active_count FROM rets_property WHERE L_Status = 'Active' AND L_City = ?`,
    [city],
  );
  const [sold] = await query<{ sold_count: number }>(
    `SELECT COUNT(*) AS sold_count
     FROM california_sold
     WHERE PropertyType = 'Residential'
       AND City = ?
       AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       AND CloseDate <= CURDATE()`,
    [city],
  );

  const activeListings = Number(active?.active_count ?? 0);
  const soldLast12Months = Number(sold?.sold_count ?? 0);
  const monthlyPace = soldLast12Months / 12;
  const monthsOfInventory =
    monthlyPace > 0 ? Number((activeListings / monthlyPace).toFixed(1)) : null;

  return { city, activeListings, soldLast12Months, monthsOfInventory };
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(value: number | null, digits = 1): string {
  if (value == null) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function buyTimingTake(summary: MarketSummary, yoy: YoYComparison | null): string {
  const signals: string[] = [];
  if (summary.listToClosePct != null) {
    if (summary.listToClosePct < 98) {
      signals.push("list-to-close under 98% suggests buyers still have negotiation room");
    } else if (summary.listToClosePct >= 100) {
      signals.push("list-to-close at/above 100% points to a stronger seller environment");
    } else {
      signals.push("list-to-close near 100% means prices are holding close to ask");
    }
  }
  if (yoy?.priceChangePct != null) {
    if (yoy.priceChangePct < -2) {
      signals.push(`avg close price is down ${Math.abs(yoy.priceChangePct)}% vs the prior 12 months`);
    } else if (yoy.priceChangePct > 2) {
      signals.push(`avg close price is up ${yoy.priceChangePct}% vs the prior 12 months`);
    } else {
      signals.push("YoY prices are roughly flat");
    }
  }
  if (summary.avgDom != null) {
    signals.push(
      summary.avgDom >= 45
        ? `homes are sitting longer (~${summary.avgDom} DOM)`
        : `homes are moving in about ${summary.avgDom} days on average`,
    );
  }
  return signals.length
    ? `Data-backed take: ${signals.join("; ")}.`
    : "Not enough comps to judge timing yet.";
}

export function formatMarketReply(report: {
  parsed: ParsedMarketQuery;
  summary: MarketSummary | null;
  trends: MonthlyTrendRow[];
  yoy: YoYComparison | null;
  inventory: InventoryComparison | null;
}): string {
  const { parsed, summary, trends, yoy, inventory } = report;
  if (!parsed.city) {
    return 'Tell me which California city to analyze (e.g. "market stats for San Diego" or "avg price per sq ft in Pasadena").';
  }
  if (!summary) {
    return `No residential sold comps found for ${parsed.city}${parsed.zip ? ` (${parsed.zip})` : ""} in the last ${parsed.months} months.`;
  }

  const location = summary.zip ? `${summary.city} ${summary.zip}` : summary.city;
  const lines = [
    `Market stats — ${location} (last ${summary.months} months, residential)`,
    "",
    `• Sold comps: ${summary.soldCount}`,
    `• Median close: ${formatCurrency(summary.medianClosePrice)}`,
    `• Avg close: ${formatCurrency(summary.avgClosePrice)}`,
    `• Avg $/sqft: ${formatCurrency(summary.avgPricePerSqft)}`,
    `• Avg DOM: ${summary.avgDom ?? "N/A"}`,
    `• List-to-close: ${summary.listToClosePct != null ? `${summary.listToClosePct}%` : "N/A"}`,
  ];

  if (yoy && (yoy.recentSoldCount > 0 || yoy.priorSoldCount > 0)) {
    lines.push(
      "",
      "Year-over-year:",
      `• Avg price: ${formatCurrency(yoy.recentAvgPrice)} vs ${formatCurrency(yoy.priorAvgPrice)} (${formatPct(yoy.priceChangePct)})`,
      `• Avg DOM: ${yoy.recentAvgDom ?? "N/A"} vs ${yoy.priorAvgDom ?? "N/A"}`,
      `• Sales: ${yoy.recentSoldCount} vs ${yoy.priorSoldCount}`,
    );
  }

  if (trends.length > 0 && (parsed.intent === "trend" || parsed.intent === "summary" || parsed.intent === "buy_timing")) {
    const recent = trends.slice(-6);
    lines.push("", "Recent monthly trend (avg close):");
    for (const row of recent) {
      const change = row.priceChangePct != null ? ` (${formatPct(row.priceChangePct)})` : "";
      lines.push(`• ${row.month}: ${formatCurrency(row.avgPrice)} · ${row.sales} sales · DOM ${row.avgDom ?? "N/A"}${change}`);
    }
  }

  if (inventory) {
    lines.push(
      "",
      "Inventory:",
      `• Active listings (rets_property): ${inventory.activeListings}`,
      `• Sold last 12 months: ${inventory.soldLast12Months}`,
      `• Months of inventory: ${inventory.monthsOfInventory ?? "N/A"}`,
    );
  }

  if (parsed.intent === "buy_timing") {
    lines.push("", buyTimingTake(summary, yoy));
  }

  return lines.join("\n");
}

/** End-to-end: parse question → query california_sold (+ active inventory) → formatted reply. */
export async function answerMarketQuestion(queryText: string): Promise<MarketReport> {
  const parsed = parseMarketQuery(queryText);

  if (!parsed.city) {
    return {
      query: queryText,
      parsed,
      summary: null,
      trends: [],
      yoy: null,
      inventory: null,
      reply: formatMarketReply({ parsed, summary: null, trends: [], yoy: null, inventory: null }),
    };
  }

  const options = {
    months: parsed.months,
    zip: parsed.zip,
    propertyType: parsed.propertyType,
  };

  const [summary, trends, yoy, inventory] = await Promise.all([
    getCityMarketSummary(parsed.city, options),
    getMonthlyTrends(parsed.city, options),
    getYoYComparison(parsed.city, { zip: parsed.zip, propertyType: parsed.propertyType }),
    parsed.intent === "inventory" || parsed.intent === "buy_timing" || parsed.intent === "summary"
      ? getInventoryComparison(parsed.city)
      : Promise.resolve(null),
  ]);

  return {
    query: queryText,
    parsed,
    summary,
    trends,
    yoy,
    inventory,
    reply: formatMarketReply({ parsed, summary, trends, yoy, inventory }),
  };
}
