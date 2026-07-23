import { describe, expect, it } from "vitest";
import {
  buildCitySummaryQuery,
  buildMedianPriceQuery,
  buildMonthlyTrendQuery,
  formatMarketReply,
} from "../src/marketStats.js";
import type { ParsedMarketQuery } from "../src/parseMarketQuery.js";

describe("buildCitySummaryQuery", () => {
  it("builds a parameterized city summary query", () => {
    const result = buildCitySummaryQuery("San Diego", { months: 12 });
    expect(result.sql).toContain("FROM california_sold");
    expect(result.sql).toContain("PropertyType = 'Residential'");
    expect(result.sql).toContain("City = ?");
    expect(result.sql).toContain("avg_price_per_sqft");
    expect(result.sql).toContain("list_to_close_pct");
    expect(result.params).toEqual([12, "San Diego"]);
  });

  it("adds zip and subtype filters when present", () => {
    const result = buildCitySummaryQuery("San Jose", {
      months: 6,
      zip: "95129",
      propertyType: "Condominium",
    });
    expect(result.sql).toContain("PostalCode = ?");
    expect(result.sql).toContain("PropertySubType = ?");
    expect(result.params).toEqual([6, "San Jose", "95129", "Condominium"]);
  });
});

describe("buildMonthlyTrendQuery", () => {
  it("groups by month like the handbook example", () => {
    const result = buildMonthlyTrendQuery("Pasadena", { months: 24 });
    expect(result.sql).toContain("DATE_FORMAT(CloseDate, '%Y-%m')");
    expect(result.sql).toContain("GROUP BY DATE_FORMAT(CloseDate, '%Y-%m')");
    expect(result.params).toEqual([24, "Pasadena"]);
  });
});

describe("buildMedianPriceQuery", () => {
  it("inlines a safe median offset", () => {
    const result = buildMedianPriceQuery("Irvine", { months: 12, offset: 100 });
    expect(result.sql).toContain("ORDER BY ClosePrice ASC LIMIT 1 OFFSET 100");
    expect(result.params).toEqual([12, "Irvine"]);
  });
});

describe("formatMarketReply", () => {
  const parsed: ParsedMarketQuery = {
    city: "San Diego",
    zip: null,
    propertyType: null,
    months: 12,
    intent: "buy_timing",
  };

  it("asks for a city when missing", () => {
    const reply = formatMarketReply({
      parsed: { ...parsed, city: null },
      summary: null,
      trends: [],
      yoy: null,
      inventory: null,
    });
    expect(reply).toMatch(/which California city/i);
  });

  it("includes median, DOM, list-to-close, and trend lines", () => {
    const reply = formatMarketReply({
      parsed,
      summary: {
        city: "San Diego",
        zip: null,
        months: 12,
        soldCount: 4000,
        avgClosePrice: 1_100_000,
        medianClosePrice: 995_000,
        avgPricePerSqft: 720,
        avgDom: 30.3,
        listToClosePct: 99.4,
      },
      trends: [
        { month: "2026-06", sales: 300, avgPrice: 1_050_000, avgDom: 28, priceChangePct: 1.2 },
        { month: "2026-07", sales: 280, avgPrice: 1_060_000, avgDom: 31, priceChangePct: 1.0 },
      ],
      yoy: {
        recentAvgPrice: 1_100_000,
        priorAvgPrice: 1_050_000,
        priceChangePct: 4.8,
        recentAvgDom: 30,
        priorAvgDom: 35,
        recentSoldCount: 4000,
        priorSoldCount: 3800,
      },
      inventory: {
        city: "San Diego",
        activeListings: 1200,
        soldLast12Months: 4000,
        monthsOfInventory: 3.6,
      },
    });

    expect(reply).toContain("Median close: $995,000");
    expect(reply).toContain("Avg DOM: 30.3");
    expect(reply).toContain("List-to-close: 99.4%");
    expect(reply).toContain("2026-07");
    expect(reply).toContain("Data-backed take");
    expect(reply).toContain("Active listings");
  });
});
