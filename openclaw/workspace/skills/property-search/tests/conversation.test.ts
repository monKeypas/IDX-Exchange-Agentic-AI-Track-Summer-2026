import { afterEach, describe, expect, it } from "vitest";
import {
  formatListingResults,
  isSearchReady,
  nextMissingQuestion,
  parseConversationalUpdate,
} from "../src/conversation.js";
import type { ListingRow } from "../src/mlsSearch.js";
import { getSession, resetAllSessions, updateSession } from "../src/session.js";

afterEach(() => {
  resetAllSessions();
});

describe("session memory", () => {
  it("creates and updates a session in the handbook shape", () => {
    const session = getSession("user-1");
    expect(session.conversationStep).toBe(0);

    updateSession("user-1", { city: "Irvine", maxPrice: 1_200_000, conversationStep: 1 });
    expect(getSession("user-1")).toMatchObject({
      city: "Irvine",
      maxPrice: 1_200_000,
      conversationStep: 1,
    });
  });
});

describe("search readiness", () => {
  it("requires location + budget + preference detail", () => {
    expect(isSearchReady({ conversationStep: 0 })).toBe(false);
    expect(isSearchReady({ conversationStep: 1, city: "Irvine" })).toBe(false);
    expect(isSearchReady({ conversationStep: 2, city: "Irvine", maxPrice: 1_200_000 })).toBe(false);
    expect(
      isSearchReady({ conversationStep: 3, city: "Irvine", maxPrice: 1_200_000, bedsMin: 3 }),
    ).toBe(true);
    expect(
      isSearchReady({
        conversationStep: 3,
        zip: "95129",
        minPrice: 800_000,
        maxPrice: 1_500_000,
        garage: true,
      }),
    ).toBe(true);
    expect(
      isSearchReady({
        conversationStep: 3,
        city: "Irvine",
        maxPrice: 1_200_000,
        type: "SingleFamilyResidence",
      }),
    ).toBe(true);
  });

  it("asks only for the next missing field", () => {
    expect(nextMissingQuestion({ conversationStep: 0 })).toMatch(/city|zip/i);
    expect(nextMissingQuestion({ conversationStep: 1, city: "Irvine" })).toMatch(/budget/i);
    expect(
      nextMissingQuestion({ conversationStep: 2, city: "Irvine", maxPrice: 1_200_000 }),
    ).toMatch(/condo|townhome|single family|beds|garage|keywords/i);
    expect(
      nextMissingQuestion({
        conversationStep: 3,
        city: "Irvine",
        maxPrice: 1_200_000,
        bedsMin: 3,
      }),
    ).toBeNull();
  });
});

describe("parseConversationalUpdate", () => {
  it("accepts several preferences in one message", async () => {
    const updates = await parseConversationalUpdate(
      "Single family with at least 3 beds under $1.2M",
    );
    expect(updates).toMatchObject({
      maxPrice: 1_200_000,
      bedsMin: 3,
      type: "SingleFamilyResidence",
    });
  });

  it("accepts bare budget, city, and zip replies", async () => {
    expect(await parseConversationalUpdate("Under $1.2M")).toMatchObject({ maxPrice: 1_200_000 });
    expect(await parseConversationalUpdate("1.2M")).toMatchObject({ maxPrice: 1_200_000 });
    expect(await parseConversationalUpdate("under 3 million")).toMatchObject({
      maxPrice: 3_000_000,
    });
    expect(await parseConversationalUpdate("Irvine")).toMatchObject({ city: "Irvine" });
    expect(await parseConversationalUpdate("95129")).toMatchObject({ zip: "95129" });
  });

  it("does not treat bay area as a city", async () => {
    const updates = await parseConversationalUpdate("city can be any city in the bay area");
    expect(updates.city).toBeUndefined();
  });
});

describe("formatListingResults", () => {
  it("formats address, price, beds/baths, and photo count", () => {
    const rows: ListingRow[] = [
      {
        L_ListingID: "1",
        L_DisplayId: "1",
        L_Address: "123 Main St",
        L_City: "Irvine",
        L_Zip: "92618",
        price: 1_100_000,
        beds: 3,
        baths: 2,
        sqft: 1600,
        type: "SingleFamilyResidence",
        status: "Active",
        lat: null,
        lng: null,
        YearBuilt: 2000,
        AssociationFee: null,
        DaysOnMarket: 10,
        PoolPrivateYN: null,
        ViewYN: null,
        FireplaceYN: null,
        PhotoCount: 18,
        LA1_UserFirstName: null,
        LA1_UserLastName: null,
        LO1_OrganizationName: null,
      },
    ];

    const text = formatListingResults(rows);
    expect(text).toContain("123 Main St, Irvine, 92618");
    expect(text).toContain("$1,100,000");
    expect(text).toContain("3 bd / 2 ba");
    expect(text).toContain("18 photos");
  });
});
