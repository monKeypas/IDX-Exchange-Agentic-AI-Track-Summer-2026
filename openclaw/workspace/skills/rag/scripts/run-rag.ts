#!/usr/bin/env npx tsx
import { ragAnswer } from "../src/rag.js";
import { closePool } from "../../market-stats/src/mysql.js";

/**
 * Grounded RAG Q&A over indexed knowledge docs.
 *
 * Usage:
 *   npm run rag -- "What does DOM mean?"
 *   npm run rag -- --json "What columns are in california_sold?"
 */

const args = process.argv.slice(2).filter((a) => a !== "--json");
const asJson = process.argv.includes("--json");
const queryText = args.join(" ").trim();

if (!queryText) {
  console.error('Usage: npm run rag -- "What does DOM mean?"');
  process.exit(1);
}

try {
  const result = await ragAnswer(queryText, { topK: 4 });
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.reply);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await closePool();
}
