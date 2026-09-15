#!/usr/bin/env npx tsx
import { orchestrate } from "../src/orchestrate.js";
import { onWhatsAppMessage } from "../src/whatsapp.js";
import { closePool as closeMarketPool } from "../../skills/market-stats/src/mysql.js";
import { closePool as closeSearchPool } from "../../skills/property-search/src/mysql.js";
import { closePool as closeRecommendPool } from "../../skills/recommendations/src/mysql.js";

/**
 * WhatsApp / OpenClaw entry point (Week 9–10).
 *
 * Usage:
 *   npm run orchestrate -- --user alice "Find affordable homes in Pasadena"
 *   npm run orchestrate -- --user alice --json "What does DOM mean?"
 *
 * Prefer --stdin for anything a user typed. A message inside double quotes is
 * mangled by the shell before it ever reaches this script — "Under $1.2M"
 * arrives as "Under .2M", because $1 expands to an empty positional parameter,
 * which silently turns a $1.2M budget into $200,000. Single quotes stop that
 * but break on apostrophes ("chef's kitchen"). A quoted heredoc does neither:
 *
 *   npm run orchestrate -- --user alice --stdin <<'MSG'
 *   Under $1.2M
 *   MSG
 */

import { readFileSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => a !== "--json" && a !== "--stdin");
const asJson = process.argv.includes("--json");
const fromStdin = process.argv.includes("--stdin");
let userId = process.env.CHAT_USER_ID?.trim() || "local";
const messageParts: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--user" || args[i] === "-u") {
    userId = args[i + 1]?.trim() || userId;
    i += 1;
    continue;
  }
  messageParts.push(args[i]);
}

// Read the raw message from stdin when asked, so no shell expansion can touch it.
const queryText = fromStdin
  ? readFileSync(0, "utf8").trim()
  : messageParts.join(" ").trim();

if (!queryText) {
  console.error(
    'Usage: npm run orchestrate -- --user <userId> "Find affordable homes in Pasadena and tell me whether prices are rising"',
  );
  process.exit(1);
}

try {
  if (asJson) {
    const result = await orchestrate(queryText, userId);
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Week 10 path: typing hook → orchestrate → formatForWhatsApp (+ soft error message)
    console.log(await onWhatsAppMessage(queryText, userId));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await Promise.all([closeSearchPool(), closeMarketPool(), closeRecommendPool()]);
}
