#!/usr/bin/env npx tsx
import { answerMarketQuestion } from "../src/marketStats.js";
import { closePool } from "../src/mysql.js";

const queryText = process.argv.slice(2).join(" ").trim();

if (!queryText) {
  console.error('Usage: npm run market -- "Is now a good time to buy in San Diego?"');
  process.exit(1);
}

try {
  const result = await answerMarketQuestion(queryText);
  // Default: WhatsApp-ready text. Pass --json for structured output.
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.reply);
  }
} finally {
  await closePool();
}
