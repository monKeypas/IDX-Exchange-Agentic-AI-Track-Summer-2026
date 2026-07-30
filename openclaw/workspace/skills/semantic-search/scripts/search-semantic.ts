#!/usr/bin/env npx tsx
import { searchSemanticListings } from "../src/semanticSearch.js";
import { closePool } from "../src/mysql.js";

/**
 * Semantic search over precomputed listing embeddings.
 *
 * Usage:
 *   npm run search:semantic -- "charming craftsman with mountain views and character"
 *   npm run search:semantic -- --json "quiet street near parks"
 */

const args = process.argv.slice(2).filter((a) => a !== "--json");
const asJson = process.argv.includes("--json");
const queryText = args.join(" ").trim();

if (!queryText) {
  console.error(
    'Usage: npm run search:semantic -- "charming craftsman with mountain views and character"',
  );
  process.exit(1);
}

try {
  const result = await searchSemanticListings(queryText, { topK: 5 });
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.reply);
  }
} finally {
  await closePool();
}
