export type OrchestratorIntent =
  | "search"
  | "market"
  | "recommend"
  | "knowledge"
  | "email"
  | "mixed"
  | "unknown";

const SEARCH =
  /\b(find|show|search|look for|homes?|listings?|properties|bed|bath|condo|townhome|affordable|under \$|bedroom|house)\b/i;
const MARKET =
  /\b(market|prices?\s+(rising|falling|increasing|decreasing|trend)|good time to buy|stats|dom|list-to-close|median|inventory|trend|avg price|price per sq|whether prices)\b/i;
const RECOMMEND = /\b(similar|recommend|properties like|homes like|i like|find me similar|like this)\b/i;
const KNOWLEDGE =
  /\b(what (does|is|are)|define|meaning of|columns (are )?in|disclosure|escrow|cap rate|what's a|what is a)\b/i;
const EMAIL = /\b(email|e-mail|draft|compose|send (me )?(a )?summary|write (me )?(an )?email)\b/i;

/** Route incoming WhatsApp text to the right agent(s). */
export function classifyIntent(query: string): OrchestratorIntent {
  const q = query.trim();
  if (!q) return "unknown";

  const definitional = /^what (does|is|are)\b/i.test(q);
  const hasSearch = SEARCH.test(q);
  const hasMarket = MARKET.test(q) && !definitional;
  const hasRecommend = RECOMMEND.test(q);
  const hasKnowledge = KNOWLEDGE.test(q);
  const hasEmail = EMAIL.test(q);

  if (hasSearch && hasMarket) return "mixed";
  if (hasEmail) return "email";
  if (hasRecommend) return "recommend";
  if (hasKnowledge && !hasSearch && !hasMarket) return "knowledge";
  if (hasMarket && !hasSearch) return "market";
  if (hasSearch) return "search";
  if (hasMarket) return "market";

  return "unknown";
}
