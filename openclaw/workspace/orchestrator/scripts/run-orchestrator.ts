#!/usr/bin/env npx tsx
import { orchestrate } from "../src/orchestrate.js";
import { closePool as closeMarketPool } from "../../skills/market-stats/src/mysql.js";
import { closePool as closeSearchPool } from "../../skills/property-search/src/mysql.js";
import { closePool as closeRecommendPool } from "../../skills/recommendations/src/mysql.js";

/**
 * Single OpenClaw entry point — routes to the right agent(s).
 *
 * Usage:
 *   npm run orchestrate -- --user alice "Find affordable homes in Pasadena and tell me whether prices are rising"
 *   npm run orchestrate -- --user alice --json "What does DOM mean?"
 */

const args = process.argv.slice(2).filter((a) => a !== "--json");
const asJson = process.argv.includes("--json");
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

const queryText = messageParts.join(" ").trim();

if (!queryText) {
  console.error(
    'Usage: npm run orchestrate -- --user <userId> "Find affordable homes in Pasadena and tell me whether prices are rising"',
  );
  process.exit(1);
}

try {
  const result = await orchestrate(queryText, userId);
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.reply);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await Promise.all([closeSearchPool(), closeMarketPool(), closeRecommendPool()]);
}
