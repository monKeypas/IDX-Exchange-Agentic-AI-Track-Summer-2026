import { answerMarketQuestion } from "../../market-stats/src/marketStats.js";
import { parsePropertyQuery } from "../../property-search/src/parsePropertyQuery.js";
import { searchActiveListings } from "../../property-search/src/mlsSearch.js";
import {
  formatListingResults,
  getSession,
  updateSession,
} from "../../property-search/src/session.js";
import { recommendSimilarListings } from "../../recommendations/src/recommend.js";
import { ragAnswer } from "../../rag/src/rag.js";
import { formatEmailDraft, inferEmailSubject } from "./emailDraft.js";

export interface AgentResult {
  agent: string;
  reply: string;
}

export async function propertySearchAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  const filters = await parsePropertyQuery(query);
  const { rows } = await searchActiveListings(filters, 1, 5);
  updateSession(userId, { lastResults: rows, conversationStep: getSession(userId).conversationStep + 1 });
  return {
    agent: "propertySearchAgent",
    reply: formatListingResults(rows),
  };
}

export async function marketStatsAgent(query: string): Promise<AgentResult> {
  const report = await answerMarketQuestion(query);
  return {
    agent: "marketStatsAgent",
    reply: report.reply,
  };
}

export async function recommendationAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  let text = query.trim();
  const session = getSession(userId);
  const liked = session.lastResults?.[0];
  if (liked && !/\b(like|similar|recommend)\b/i.test(text)) {
    const address = [liked.L_Address, liked.L_City].filter(Boolean).join(", ");
    text = `I like ${address}, find similar homes`;
  }
  const result = await recommendSimilarListings(text, { topK: 5 });
  return {
    agent: "recommendationAgent",
    reply: result.reply,
  };
}

export async function ragAgent(query: string): Promise<AgentResult> {
  const result = await ragAnswer(query, { topK: 4 });
  return {
    agent: "ragAgent",
    reply: result.reply,
  };
}

export async function emailDraftAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  const lower = query.toLowerCase();
  const wantsMarket = /\b(market|stats|trend|dom|prices?)\b/i.test(lower);
  const wantsListings = /\b(home|listing|property|condo|house)\b/i.test(lower);

  let body = "";
  if (wantsListings || !wantsMarket) {
    const listings = await propertySearchAgent(query, userId);
    body = listings.reply;
  }
  if (wantsMarket) {
    const stats = await marketStatsAgent(query);
    body = body ? `${body}\n\n${stats.reply}` : stats.reply;
  }
  if (!body) {
    const listings = await propertySearchAgent(query, userId);
    body = listings.reply;
  }

  const subject = inferEmailSubject(
    query,
    wantsMarket ? "Market update" : "Property listings summary",
  );
  return {
    agent: "emailDraftAgent",
    reply: formatEmailDraft({ subject, body }),
  };
}
