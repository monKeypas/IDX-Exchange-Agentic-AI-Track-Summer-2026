import { parseMarketQuery } from "../../market-stats/src/parseMarketQuery.js";
import { answerMarketQuestion } from "../../market-stats/src/marketStats.js";
import type { RetrievedChunk } from "./retrieve.js";

export const WEEK5_MARKET_SOURCE = "market-stats (Week 5 live report)";

/** True when the question names a city (in/for X) so Week 5 can fetch a live report. */
export function shouldFetchWeek5Report(query: string): boolean {
  const parsed = parseMarketQuery(query);
  if (!parsed.city) return false;
  // parseMarketQuery can over-fit short tokens (e.g. "DOM"); require an explicit place cue.
  return /\b(?:in|for|about)\s+[A-Za-z]/.test(query);
}

export async function fetchWeek5MarketChunk(query: string): Promise<RetrievedChunk | null> {
  if (!shouldFetchWeek5Report(query)) return null;
  const report = await answerMarketQuestion(query);
  if (!report.parsed.city || !report.summary) return null;
  return {
    source: WEEK5_MARKET_SOURCE,
    chunk: report.reply,
    score: 1,
  };
}
