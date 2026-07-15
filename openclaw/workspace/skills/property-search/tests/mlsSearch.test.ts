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
        zip: null,
        state: null,
        county: null,
        subdivision: null,
        minPrice: null,
        maxPrice: 1_500_000,
        bedsMin: 3,
        bedsMax: null,
        bathsMin: 2,
        sqftMin: 1500,
        lotSqftMin: null,
        type: "Condominium",
        yearBuiltMin: null,
        yearBuiltMax: null,
        newConstruction: null,
        pool: true,
        view: true,
        fireplace: null,
        garage: null,
        spa: null,
        attachedGarage: null,
        maxHoa: null,
        highSchoolDistrict: null,
        keywords: null,
        maxDaysOnMarket: null,
      },
      2,
      25,
    );

    expect(result.sql).toContain("FROM rets_property");
    expect(result.sql).toContain("WHERE L_Status = \"Active\"");
    expect(result.sql).toContain("L_City = ?");
    expect(result.sql).toContain("PoolPrivateYN");
    expect(result.sql).toContain("LIMIT 25 OFFSET 25");

    expect(result.params).toEqual(["Irvine", 1_500_000, 3, 2, 1500, "Condominium"]);
  });

  it("uses exact bed match when min equals max", () => {
    const result = buildActiveListingsQuery(
      {
        city: "San Jose",
        zip: "95129",
        state: null,
        county: null,
        subdivision: null,
        minPrice: 1_000_000,
        maxPrice: 2_000_000,
        bedsMin: 4,
        bedsMax: 4,
        bathsMin: null,
        sqftMin: null,
        lotSqftMin: null,
        type: null,
        yearBuiltMin: 2000,
        yearBuiltMax: null,
        newConstruction: true,
        pool: null,
        view: null,
        fireplace: null,
        garage: true,
        spa: null,
        attachedGarage: null,
        maxHoa: 500,
        highSchoolDistrict: null,
        keywords: "river",
        maxDaysOnMarket: null,
      },
      1,
      10,
    );

    expect(result.sql).toContain("L_Zip = ?");
    expect(result.sql).toContain("L_Keyword2 = ?");
    expect(result.sql).toContain("L_SystemPrice >= ?");
    expect(result.sql).toContain("YearBuilt >= ?");
    expect(result.sql).toContain("GarageYN");
    expect(result.sql).toContain("MATCH(L_Remarks)");
    expect(result.params).toContain("95129");
    expect(result.params).toContain(4);
    expect(result.params).toContain("river*");
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
