import { describe, expect, it } from "vitest";
import { classifyIntent } from "../src/classifyIntent.js";
import { formatEmailDraft } from "../src/emailDraft.js";
import { formatCombinedResponse } from "../src/orchestrate.js";

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
