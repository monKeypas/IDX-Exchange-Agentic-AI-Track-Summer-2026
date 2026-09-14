import { describe, expect, it } from "vitest";
import { classifyIntent, extractDraftId, isApprovalCommand } from "../src/classifyIntent.js";
import { referencedResultIndex } from "../src/agents.js";
import { formatEmailDraft } from "../src/emailDraft.js";
import { formatCombinedResponse } from "../src/orchestrate.js";
import { formatForWhatsApp } from "../src/whatsapp.js";

describe("classifyIntent", () => {
  it("routes pure search queries", () => {
    expect(classifyIntent("Find 3 bedroom condos in Irvine under 1.5m")).toBe("search");
  });

  it("routes pure market queries", () => {
    expect(classifyIntent("Is now a good time to buy in San Diego?")).toBe("market");
  });

  it("routes recommend queries", () => {
    expect(classifyIntent("I like 257 Fay Way, find similar homes")).toBe("recommend");
  });

  it("routes knowledge queries", () => {
    expect(classifyIntent("What does DOM mean?")).toBe("knowledge");
    expect(classifyIntent("What columns are in california_sold?")).toBe("knowledge");
  });

  it("routes email queries", () => {
    expect(classifyIntent("Draft an email about Pasadena market trends")).toBe("email");
  });

  it("detects mixed search + market intent", () => {
    expect(
      classifyIntent(
        "Find me affordable homes in Pasadena and tell me whether prices are rising",
      ),
    ).toBe("mixed");
  });

  it("returns unknown for empty input", () => {
    expect(classifyIntent("   ")).toBe("unknown");
  });
});

describe("formatCombinedResponse", () => {
  it("merges listing and market sections", () => {
    const reply = formatCombinedResponse(
      { agent: "propertySearchAgent", reply: "Here are 3 active listings" },
      { agent: "marketStatsAgent", reply: "Market stats — Pasadena" },
    );
    expect(reply).toContain("Property search");
    expect(reply).toContain("Here are 3 active listings");
    expect(reply).toContain("Market stats");
    expect(reply).toContain("Market stats — Pasadena");
  });
});

describe("formatEmailDraft", () => {
  it("includes subject and draft footer", () => {
    const draft = formatEmailDraft({
      subject: "Pasadena listings",
      body: "Top homes under $1M",
    });
    expect(draft).toContain("Subject: Pasadena listings");
    expect(draft).toContain("Top homes under $1M");
    expect(draft).toContain("Draft only — not sent.");
  });
});

describe("formatForWhatsApp", () => {
  it("returns orchestrator reply text", () => {
    expect(
      formatForWhatsApp({
        query: "q",
        intent: "market",
        agents: ["marketStatsAgent"],
        reply: "Market stats — Pasadena",
      }),
    ).toBe("Market stats — Pasadena");
  });

  it("formats structured listing cards when provided", () => {
    const text = formatForWhatsApp({
      query: "q",
      intent: "search",
      agents: ["propertySearchAgent"],
      reply: "",
      listings: [
        {
          L_Address: "123 Main St",
          L_City: "Pasadena",
          price: 900000,
          beds: 3,
          baths: 2,
          sqft: 1500,
          DaysOnMarket: 12,
        },
      ],
    });
    expect(text).toContain("*123 Main St, Pasadena*");
    expect(text).toContain("$900,000");
    expect(text).toContain("3bd/2ba");
    expect(text).toContain("12 days on market");
  });

  it("falls back when empty", () => {
    expect(
      formatForWhatsApp({
        query: "q",
        intent: "unknown",
        agents: [],
        reply: "",
      }),
    ).toBe("No results found.");
  });
});

describe("classifyIntent — WhatsApp refinements", () => {
  // Plural phrasing is what people actually type in a follow-up message.
  it.each([
    "3 bedrooms",
    "Only 3 bedrooms",
    "make it 4 bedrooms",
    "3 beds",
    "2 baths",
    "with a pool",
    "add a garage",
    "Under $1.2M",
  ])("routes %j as a search refinement", (text) => {
    expect(classifyIntent(text)).toBe("search");
  });
});

describe("classifyIntent — semantic search", () => {
  it("routes descriptive prose with no structured filters", () => {
    expect(classifyIntent("charming craftsman with mountain views")).toBe("semantic");
    expect(classifyIntent("somewhere quiet with lots of natural light")).toBe("semantic");
  });

  it("prefers structured search when filters are present", () => {
    expect(classifyIntent("cozy 3 bedroom condo in Irvine")).toBe("search");
  });

  it("does not treat greetings as descriptions", () => {
    expect(classifyIntent("hey there")).toBe("unknown");
    expect(classifyIntent("thanks!")).toBe("unknown");
  });
});

describe("classifyIntent — email approval guardrail", () => {
  it("routes explicit approval commands", () => {
    for (const text of ["approve", "send it", "yes, send it", "ship it"]) {
      expect(classifyIntent(text)).toBe("email_approve");
    }
  });

  it("keeps draft requests separate from sending", () => {
    expect(classifyIntent("Draft an email about Pasadena listings")).toBe("email");
    expect(classifyIntent("send me a summary of Irvine condos")).toBe("email");
    expect(isApprovalCommand("send me a summary of Irvine condos")).toBe(false);
  });

  it("extracts an explicit draft id when given", () => {
    const id = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
    expect(extractDraftId(`approve ${id}`)).toBe(id);
    expect(extractDraftId("approve")).toBeNull();
  });
});

describe("classifyIntent — definition vs statistic", () => {
  // "DOM" and "median" are market vocabulary, but a question can still be definitional.
  it("routes definition questions to knowledge", () => {
    expect(classifyIntent("What does DOM mean?")).toBe("knowledge");
    expect(classifyIntent("What is escrow?")).toBe("knowledge");
  });

  // A "what is" question asking for a number is a market question, not a definition.
  it("routes metric questions to market even when they start with 'what is'", () => {
    expect(classifyIntent("What is the median price in Irvine?")).toBe("market");
    expect(classifyIntent("What is the average price per sq ft in Pasadena?")).toBe("market");
  });

  it("still treats a numbered square-footage filter as a search", () => {
    expect(classifyIntent("3 bed 2.5 bath 1800 sqft in Irvine")).toBe("search");
  });
});

describe("referencedResultIndex", () => {
  // "the first one" carries no meaning for the similarity matcher — it has to
  // be resolved to the listing the user is pointing at before the search runs.
  it("resolves ordinal references", () => {
    expect(referencedResultIndex("I like the first one, find similar homes")).toBe(0);
    expect(referencedResultIndex("show me more like the third")).toBe(2);
  });

  it("resolves numbered and demonstrative references", () => {
    expect(referencedResultIndex("similar to #2")).toBe(1);
    expect(referencedResultIndex("find more like that one")).toBe(0);
  });

  it("returns null when no position is named", () => {
    expect(referencedResultIndex("homes like 257 Fay Way")).toBeNull();
  });
});
