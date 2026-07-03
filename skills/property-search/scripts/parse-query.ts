#!/usr/bin/env npx tsx
import { parsePropertyQuery, toRetsFilters } from "../../../src/parsePropertyQuery.js";

const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error('Usage: npm run parse -- "<property search query>"');
  process.exit(1);
}

const parsed = await parsePropertyQuery(query);

console.log(
  JSON.stringify(
    {
      query,
      parsed,
      retsFilters: toRetsFilters(parsed),
    },
    null,
    2,
  ),
);
