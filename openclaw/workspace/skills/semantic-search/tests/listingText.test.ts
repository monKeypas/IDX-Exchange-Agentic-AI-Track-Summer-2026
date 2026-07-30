import { describe, expect, it } from "vitest";
import { buildListingEmbeddingText } from "../src/listingText.js";
import { formatSemanticResults } from "../src/semanticSearch.js";

describe("buildListingEmbeddingText", () => {
  it("combines type, city, facts, and remarks", () => {
    const text = buildListingEmbeddingText({
      L_ListingID: "1",
      L_DisplayId: "1",
      L_Address: "123 Main",
      L_City: "Pasadena",
      L_Zip: "91101",
      L_Type_: "SingleFamilyResidence",
      L_SystemPrice: 1_250_000,
      L_Keyword2: 3,
      LM_Dec_3: 2,
      LM_Int2_3: 1800,
      YearBuilt: 1925,
      L_Remarks: "Charming craftsman with mountain views and original character.",
      PhotoCount: 12,
    });

    expect(text).toContain("SingleFamilyResidence in Pasadena, CA.");
    expect(text).toContain("3 beds, 2 baths.");
    expect(text).toContain("1800 sq ft.");
    expect(text).toContain("Built 1925.");
    expect(text).toContain("Price: $1,250,000.");
    expect(text).toContain("Charming craftsman with mountain views");
  });
});

describe("formatSemanticResults", () => {
  it("formats top matches with similarity", () => {
    const text = formatSemanticResults("mountain views craftsman", [
      {
        id: "1",
        score: 0.812,
        card: {
          id: "1",
          displayId: "1",
          address: "123 Oak St",
          city: "Pasadena",
          zip: "91101",
          type: "SingleFamilyResidence",
          price: 1_250_000,
          beds: 3,
          baths: 2,
          sqft: 1800,
          yearBuilt: 1925,
          photoCount: 12,
        },
      },
    ]);

    expect(text).toContain('Top 1 semantic matches for: "mountain views craftsman"');
    expect(text).toContain("123 Oak St, Pasadena, 91101");
    expect(text).toContain("$1,250,000");
    expect(text).toContain("similarity 81.2%");
  });
});
