import { describe, expect, it } from "vitest";
import { chunkText } from "../src/chunk.js";
import { extractiveAnswer } from "../src/extract.js";
import { buildRagPrompt } from "../src/generate.js";
import { shouldFetchWeek5Report, WEEK5_MARKET_SOURCE } from "../src/marketReport.js";
import { formatRagReply } from "../src/rag.js";

describe("chunkText", () => {
  it("returns empty for blank input", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk when text is shorter than size", () => {
    expect(chunkText("DOM means Days on Market.")).toEqual([
      "DOM means Days on Market.",
    ]);
  });

  it("overlaps consecutive chunks", () => {
    const text = "abcdefghijklmnopqrstuvwxyz";
    const chunks = chunkText(text, 10, 4);
    expect(chunks[0]).toBe("abcdefghij");
    expect(chunks[1].startsWith("ghij")).toBe(true);
    expect(chunks.join("").includes("z")).toBe(true);
  });
});

describe("buildRagPrompt", () => {
  it("grounds the model in retrieved chunks only", () => {
    const prompt = buildRagPrompt("What does DOM mean?", [
      { source: "real-estate-glossary", chunk: "DOM means Days on Market.", score: 0.9 },
    ]);
    expect(prompt).toContain("Answer using only the context below");
    expect(prompt).toContain("do not truncate");
    expect(prompt).toContain("DOM means Days on Market.");
    expect(prompt).toContain("Question: What does DOM mean?");
  });
});

describe("shouldFetchWeek5Report", () => {
  it("skips definition-only questions", () => {
    expect(shouldFetchWeek5Report("What does DOM mean?")).toBe(false);
    expect(shouldFetchWeek5Report("What is a list-to-close ratio?")).toBe(false);
    expect(shouldFetchWeek5Report("What columns are in california_sold?")).toBe(false);
  });

  it("fetches when the user names a city market question", () => {
    expect(shouldFetchWeek5Report("What is the average DOM in San Diego?")).toBe(true);
    expect(shouldFetchWeek5Report("Is now a good time to buy in Irvine?")).toBe(true);
  });
});

describe("extractiveAnswer", () => {
  it("prefers a live Week 5 report when present", () => {
    const answer = extractiveAnswer("What is the average DOM in San Diego?", [
      {
        source: WEEK5_MARKET_SOURCE,
        chunk: "Market stats — San Diego\n• Avg DOM: 30.3",
        score: 1,
      },
      {
        source: "real-estate-glossary",
        chunk: "DOM means Days on Market: how many days a listing was on the market.",
        score: 0.8,
      },
    ]);
    expect(answer).toContain("Avg DOM: 30.3");
  });

  it("pulls the california_sold column list from context", () => {
    const answer = extractiveAnswer("What columns are in california_sold?", [
      {
        source: "mls-field-definitions",
        chunk:
          "Complete california_sold column list: ListingKey, City, ClosePrice, DaysOnMarket.",
        score: 0.9,
      },
    ]);
    expect(answer).toContain("ListingKey, City, ClosePrice, DaysOnMarket");
  });
});

describe("formatRagReply", () => {
  it("appends unique sources", () => {
    const reply = formatRagReply("DOM is days on market.", [
      { source: "real-estate-glossary", chunk: "a", score: 0.8 },
      { source: "real-estate-glossary", chunk: "b", score: 0.7 },
      { source: "market-reports", chunk: "c", score: 0.6 },
    ]);
    expect(reply).toContain("DOM is days on market.");
    expect(reply).toContain("Sources: real-estate-glossary, market-reports");
  });
});
