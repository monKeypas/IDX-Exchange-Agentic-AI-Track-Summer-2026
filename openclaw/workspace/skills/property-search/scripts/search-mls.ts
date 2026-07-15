#!/usr/bin/env npx tsx
import { INCLUDE_SOLD_COMPS } from "../src/config.js";
import { searchMlsData } from "../src/mlsSearch.js";
import { closePool } from "../src/mysql.js";

const queryText = process.argv.slice(2).join(" ").trim();

if (!queryText) {
  console.error('Usage: npm run search:mls -- "<property search query>"');
  process.exit(1);
}

try {
  const result = await searchMlsData(queryText, {
    includeSoldComps: INCLUDE_SOLD_COMPS,
    page: 1,
    limit: 10,
    soldMonths: 12,
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await closePool();
}