import { describe, expect, it } from "vitest";
import { parseMarketQuery } from "../src/parseMarketQuery.js";

describe("parseMarketQuery", () => {
  it("parses city and buy-timing intent", () => {
    const parsed = parseMarketQuery("Is now a good time to buy in San Diego?");
    expect(parsed).toMatchObject({
      city: "San Diego",
      intent: "buy_timing",
      months: 12,
    });
  });

  it("parses price-per-sqft questions", () => {
    const parsed = parseMarketQuery("What is the average price per sq ft in Pasadena?");
    expect(parsed).toMatchObject({
      city: "Pasadena",
      intent: "ppsqft",
    });
  });

  it("parses trend and custom month windows", () => {
    const parsed = parseMarketQuery("Show 24 month price trends for Irvine");
    expect(parsed).toMatchObject({
      city: "Irvine",
      intent: "trend",
      months: 24,
    });
  });

  it("parses zip and inventory intent", () => {
    const parsed = parseMarketQuery("inventory comparison in San Jose zip 95129");
    expect(parsed).toMatchObject({
      city: "San Jose",
      zip: "95129",
      intent: "inventory",
    });
  });

  it("accepts a bare city name", () => {
    expect(parseMarketQuery("Oakland").city).toBe("Oakland");
  });
});
