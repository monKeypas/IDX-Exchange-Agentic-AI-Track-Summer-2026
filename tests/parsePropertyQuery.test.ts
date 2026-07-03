import { describe, expect, it } from "vitest";
import { parsePropertyQuery, toRetsFilters } from "../src/parsePropertyQuery.js";

describe("parsePropertyQuery", () => {
  it("parses the Week 2 example query", async () => {
    const parsed = await parsePropertyQuery(
      "Show me 3-bedroom condos in Irvine under $1.5M with a pool.",
    );

    expect(parsed).toEqual({
      city: "Irvine",
      maxPrice: 1_500_000,
      beds: 3,
      baths: null,
      sqft: null,
      type: "Condominium",
      pool: "True",
      hasView: null,
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
      beds: 4,
      baths: 3,
    });
  });

  it("parses townhome with view", async () => {
    const parsed = await parsePropertyQuery("Townhome in Irvine with view");
    expect(parsed).toMatchObject({
      city: "Irvine",
      type: "Townhouse",
      hasView: "True",
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
      beds: 2,
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
      beds: 3,
      baths: 2.5,
      sqft: 1800,
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
      pool: "True",
      hasView: "True",
    });
  });

  it("parses bedroom count without other filters", async () => {
    const parsed = await parsePropertyQuery("5 bedroom house in Palo Alto");
    expect(parsed).toMatchObject({
      city: "Palo Alto",
      beds: 5,
    });
  });

  it("returns nulls for unrecognized filters", async () => {
    const parsed = await parsePropertyQuery("anything at all");
    expect(parsed).toEqual({
      city: null,
      maxPrice: null,
      beds: null,
      baths: null,
      sqft: null,
      type: null,
      pool: null,
      hasView: null,
    });
  });

  it("parses square feet spelled out", async () => {
    const parsed = await parsePropertyQuery("Home with 2200 square feet in Irvine");
    expect(parsed.sqft).toBe(2200);
    expect(parsed.city).toBe("Irvine");
  });
});
