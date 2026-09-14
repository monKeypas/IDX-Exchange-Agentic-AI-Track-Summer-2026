export type OrchestratorIntent =
  | "search"
  | "market"
  | "recommend"
  | "knowledge"
  | "email"
  | "email_approve"
  | "semantic"
  | "mixed"
  | "unknown";

// Plural forms matter: WhatsApp refinements read "3 bedrooms", not "3 bedroom".
// `view` is deliberately absent — "mountain views" should reach semantic search.
const SEARCH =
  /\b(find|show|search|look for|homes?|listings?|properties|property|beds?|bedrooms?|baths?|bathrooms?|condos?|townhomes?|affordable|under \$|house|houses|pool|garage|fireplace|spa|\d\s*(?:sq ?ft|square feet)|hoa|acres?|zip)\b/i;
const MARKET =
  /\b(market|prices?\s+(rising|falling|increasing|decreasing|trend)|good time to buy|stats|dom|list-to-close|median|inventory|trend|avg price|price per sq|whether prices)\b/i;
const RECOMMEND = /\b(similar|recommend|properties like|homes like|i like|find me similar|like this)\b/i;
const KNOWLEDGE =
  /\b(what (does|is|are)|define|meaning of|columns (are )?in|disclosure|escrow|cap rate|what's a|what is a)\b/i;
const EMAIL = /\b(email|e-mail|draft|compose|send (me )?(a )?summary|write (me )?(an )?email)\b/i;

// Metric words mean "what is ..." is asking for a number, not a definition.
const METRIC =
  /\b(average|avg|median|price per|list-to-close|inventory|trend|stats|days on market|how much)\b/i;

// Descriptive, lifestyle-style phrasing that structured filters cannot express.
const SEMANTIC =
  /\b(charming|cozy|character|craftsman|vibe|feels? like|looking for something|quiet|spacious|natural light|curb appeal|updated|renovated|modern|rustic|historic|open floor plan|views?|walkable|move-in ready)\b/i;

// Short acknowledgements that should never be treated as a property description.
const CHITCHAT =
  /^(hi|hey|hello|yo|thanks|thank you|ok|okay|k|cool|nice|great|yes|no|nope|yep|sure|bye|good (morning|afternoon|evening|night))\b/i;

/**
 * Human approval of a queued email draft (Week 11 guardrail).
 * Kept tight so "send me a summary" stays a draft request, not a send.
 */
const APPROVE_COMMAND =
  /^\s*(approve|confirm|send it|send that|send the draft|send this|yes,? send( it)?|looks good,? send( it)?|ship it)\b/i;
const APPROVE_WITH_TARGET = /\bapprove\b.*\b(draft|email|[0-9a-f]{8}-[0-9a-f]{4})/i;

export function isApprovalCommand(query: string): boolean {
  const q = query.trim();
  return APPROVE_COMMAND.test(q) || APPROVE_WITH_TARGET.test(q);
}

/** Extract an explicit draft id, if the user named one. */
export function extractDraftId(query: string): string | null {
  const uuid = query.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  );
  return uuid ? uuid[0] : null;
}

/** Route incoming WhatsApp text to the right agent(s). */
export function classifyIntent(query: string): OrchestratorIntent {
  const q = query.trim();
  if (!q) return "unknown";

  // Approval is checked first: it acts on an existing draft, never creates one.
  if (isApprovalCommand(q)) return "email_approve";

  // "What does DOM mean?" is a definition; "What is the median price?" is a statistic.
  const definitional = /^what (does|is|are)\b/i.test(q) && !METRIC.test(q);
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

  // Free-text description with no structured filters → embedding search.
  if (CHITCHAT.test(q)) return "unknown";
  if (SEMANTIC.test(q)) return "semantic";
  if (q.split(/\s+/).length >= 3) return "semantic";

  return "unknown";
}
