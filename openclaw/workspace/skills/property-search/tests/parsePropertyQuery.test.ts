import { describe, expect, it } from "vitest";
import { emptyPropertyFilters } from "../src/propertyFilters.js";
import { parsePropertyQuery, toRetsFilters } from "../src/parsePropertyQuery.js";

describe("parsePropertyQuery", () => {
  it("parses the Week 2 example query", async () => {
    const parsed = await parsePropertyQuery(
      "Show me 3-bedroom condos in Irvine under $1.5M with a pool.",
    );

    expect(parsed).toMatchObject({
      city: "Irvine",
      maxPrice: 1_500_000,
      bedsMin: 3,
      type: "Condominium",
      pool: true,
    });

    expect(toRetsFilters(parsed)).toEqual({
      L_City: "Irvine",
      L_SystemPrice: 1_500_000,
      L_Keyword2: 3,
      L_Type_: "Condominium",
      PoolPrivateYN: "True",
    });
  });

  it("parses multi-word city names", async () => {
    const parsed = await parsePropertyQuery("Homes in Newport Beach under $2M");
    expect(parsed.city).toBe("Newport Beach");
    expect(parsed.maxPrice).toBe(2_000_000);
  });

  it("parses beds, baths, and price without dollar sign", async () => {
    const parsed = await parsePropertyQuery("4 bed 3 bath in San Jose under 800k");
    expect(parsed).toMatchObject({
      city: "San Jose",
      maxPrice: 800_000,
      bedsMin: 4,
      bathsMin: 3,
    });
  });

  it("parses townhome with view", async () => {
    const parsed = await parsePropertyQuery("Townhome in Irvine with view");
    expect(parsed).toMatchObject({
      city: "Irvine",
      type: "Townhouse",
      view: true,
    });
  });

  it("parses single family homes", async () => {
    const parsed = await parsePropertyQuery("Single family in Los Angeles under $3m");
    expect(parsed).toMatchObject({
      city: "Los Angeles",
      maxPrice: 3_000_000,
      type: "SingleFamilyResidence",
    });
  });

  it("parses comma-formatted prices", async () => {
    const parsed = await parsePropertyQuery("2 bedroom condo in San Francisco under $900,000");
    expect(parsed).toMatchObject({
      city: "San Francisco",
      maxPrice: 900_000,
      bedsMin: 2,
      type: "Condominium",
    });
  });

  it("parses land listings", async () => {
    const parsed = await parsePropertyQuery("Land in Riverside under 500k");
    expect(parsed).toMatchObject({
      city: "Riverside",
      maxPrice: 500_000,
      type: "UnimprovedLand",
    });
  });

  it("parses square footage", async () => {
    const parsed = await parsePropertyQuery("3 bed 2.5 bath 1800 sqft in Irvine");
    expect(parsed).toMatchObject({
      city: "Irvine",
      bedsMin: 3,
      bathsMin: 2.5,
      sqftMin: 1800,
    });
  });

  it("parses pool, view, and price together", async () => {
    const parsed = await parsePropertyQuery(
      "Condo in Newport Beach with pool and view under $1.2M",
    );
    expect(parsed).toMatchObject({
      city: "Newport Beach",
      maxPrice: 1_200_000,
      type: "Condominium",
      pool: true,
      view: true,
    });
  });

  it("parses bedroom count without other filters", async () => {
    const parsed = await parsePropertyQuery("5 bedroom house in Palo Alto");
    expect(parsed).toMatchObject({
      city: "Palo Alto",
      bedsMin: 5,
    });
  });

  it("returns empty filters for unrecognized input", async () => {
    const parsed = await parsePropertyQuery("anything at all");
    expect(parsed).toEqual(emptyPropertyFilters());
  });

  it("parses square feet spelled out", async () => {
    const parsed = await parsePropertyQuery("Home with 2200 square feet in Irvine");
    expect(parsed.sqftMin).toBe(2200);
    expect(parsed.city).toBe("Irvine");
  });

  it("parses budgets written as million", async () => {
    const parsed = await parsePropertyQuery("under 3 million");
    expect(parsed.maxPrice).toBe(3_000_000);
  });

  it("title-cases city names", async () => {
    const parsed = await parsePropertyQuery("house in san jose");
    expect(parsed.city).toBe("San Jose");
  });

  it("parses zip codes", async () => {
    const parsed = await parsePropertyQuery("3 bed homes in zip 95129 under 2M");
    expect(parsed).toMatchObject({
      zip: "95129",
      bedsMin: 3,
      maxPrice: 2_000_000,
    });
  });

  it("parses price ranges", async () => {
    const parsed = await parsePropertyQuery("between 2.5 and 3 million in Irvine");
    expect(parsed).toMatchObject({
      city: "Irvine",
      minPrice: 2_500_000,
      maxPrice: 3_000_000,
    });
  });

  it("parses exact bed count", async () => {
    const parsed = await parsePropertyQuery("exactly 4 beds in San Jose");
    expect(parsed).toMatchObject({
      city: "San Jose",
      bedsMin: 4,
      bedsMax: 4,
    });
  });

  it("parses year built and amenities", async () => {
    const parsed = await parsePropertyQuery(
      "Single family in Irvine built after 2010 with garage and fireplace hoa under 400",
    );
    expect(parsed).toMatchObject({
      city: "Irvine",
      type: "SingleFamilyResidence",
      yearBuiltMin: 2010,
      garage: true,
      fireplace: true,
      maxHoa: 400,
    });
  });

  it("parses waterfront keywords", async () => {
    const parsed = await parsePropertyQuery("waterfront home in Newport Beach");
    expect(parsed).toMatchObject({
      city: "Newport Beach",
      keywords: "waterfront",
    });
  });
});
