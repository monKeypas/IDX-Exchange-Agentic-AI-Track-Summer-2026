import { describe, expect, it } from "vitest";
import { buildActiveListingsQuery, buildSoldCompsQuery, normalizePagination } from "../src/mlsSearch.js";

describe("normalizePagination", () => {
  it("normalizes invalid page and limit values", () => {
    expect(normalizePagination(0, 0)).toEqual({ page: 1, limit: 1, offset: 0 });
    expect(normalizePagination(-10, 999)).toEqual({ page: 1, limit: 100, offset: 0 });
  });
});

describe("buildActiveListingsQuery", () => {
  it("builds a parameterized active listings query", () => {
    const result = buildActiveListingsQuery(
      {
        city: "Irvine",
        maxPrice: 1_500_000,
        beds: 3,
        baths: 2,
        sqft: 1500,
        type: "Condominium",
        pool: "True",
        hasView: "True",
      },
      2,
      25,
    );

    expect(result.sql).toContain("FROM rets_property");
    expect(result.sql).toContain("WHERE L_Status = \"Active\"");
    expect(result.sql).toContain("L_City = ?");
    expect(result.sql).toContain("LIMIT 25 OFFSET 25");

    expect(result.params).toEqual([
      "Irvine",
      1_500_000,
      3,
      2,
      1500,
      "Condominium",
      "True",
      "True",
    ]);
  });
});

describe("buildSoldCompsQuery", () => {
  it("builds a parameterized sold comps query", () => {
    const result = buildSoldCompsQuery("Irvine", 6);
    expect(result.sql).toContain("FROM california_sold");
    expect(result.sql).toContain("City = ?");
    expect(result.sql).toContain("INTERVAL ? MONTH");
    expect(result.params).toEqual(["Irvine", 6]);
  });
});
