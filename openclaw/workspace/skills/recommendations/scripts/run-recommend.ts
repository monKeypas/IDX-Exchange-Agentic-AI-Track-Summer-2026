#!/usr/bin/env npx tsx
import { recommendSimilarListings } from "../src/recommend.js";
import { closePool } from "../src/mysql.js";

/**
 * Hybrid recommendations: structured + embedding similarity, with sold comps.
 *
 * Usage:
 *   npm run recommend -- "I like 257 Fay Way in Mountain View, find similar homes"
 *   npm run recommend -- --json "homes like a charming craftsman in Running Springs"
 */

const args = process.argv.slice(2).filter((a) => a !== "--json");
const asJson = process.argv.includes("--json");
const queryText = args.join(" ").trim();

if (!queryText) {
  console.error(
    'Usage: npm run recommend -- "I like 257 Fay Way in Mountain View, find similar homes"',
  );
  process.exit(1);
}

try {
  const result = await recommendSimilarListings(queryText, { topK: 5 });
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.reply);
  }
} finally {
  await closePool();
}
