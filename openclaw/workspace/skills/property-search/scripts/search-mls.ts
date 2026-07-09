#!/usr/bin/env npx tsx
import { searchMlsData } from "../src/searchMlsData.js";

const args = process.argv.slice(2);
const queryText = args.join(" ").trim();

if (!queryText) {
  console.error('Usage: npm run search:mls -- "<property search query>"');
  process.exit(1);
}

const result = await searchMlsData(queryText, {
  includeSoldComps: true,
  page: 1,
  limit: 10,
  soldMonths: 12,
});

console.log(JSON.stringify(result, null, 2));
