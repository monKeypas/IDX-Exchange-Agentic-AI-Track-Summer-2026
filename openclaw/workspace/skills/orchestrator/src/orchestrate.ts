import {
  emailDraftAgent,
  marketStatsAgent,
  propertySearchAgent,
  ragAgent,
  recommendationAgent,
  type AgentResult,
} from "./agents.js";
import { classifyIntent, type OrchestratorIntent } from "./classifyIntent.js";

export interface OrchestrateResult {
  query: string;
  intent: OrchestratorIntent;
  agents: string[];
  reply: string;
}

export function formatCombinedResponse(listings: AgentResult, stats: AgentResult): string {
  return [
    "Property search",
    listings.reply,
    "",
    "Market stats",
    stats.reply,
  ].join("\n");
}

const FALLBACK =
  "I'm not sure how to help with that. Try asking about properties, market trends, definitions, or similar homes.";

/** Analyze query and route to one or more registered agents. */
export async function orchestrate(query: string, userId: string): Promise<OrchestrateResult> {
  const text = query.trim();
  const intent = classifyIntent(text);

  if (!text) {
    return { query: text, intent: "unknown", agents: [], reply: FALLBACK };
  }

  switch (intent) {
    case "search": {
      const result = await propertySearchAgent(text, userId);
      return { query: text, intent, agents: [result.agent], reply: result.reply };
    }
    case "market": {
      const result = await marketStatsAgent(text);
      return { query: text, intent, agents: [result.agent], reply: result.reply };
    }
    case "recommend": {
      const result = await recommendationAgent(text, userId);
      return { query: text, intent, agents: [result.agent], reply: result.reply };
    }
    case "knowledge": {
      const result = await ragAgent(text);
      return { query: text, intent, agents: [result.agent], reply: result.reply };
    }
    case "email": {
      const result = await emailDraftAgent(text, userId);
      return { query: text, intent, agents: [result.agent], reply: result.reply };
    }
    case "mixed": {
      const [listings, stats] = await Promise.all([
        propertySearchAgent(text, userId),
        marketStatsAgent(text),
      ]);
      return {
        query: text,
        intent,
        agents: [listings.agent, stats.agent],
        reply: formatCombinedResponse(listings, stats),
      };
    }
    default:
      return { query: text, intent, agents: [], reply: FALLBACK };
  }
}
