#!/usr/bin/env npx tsx
import { buildEmbeddingIndex } from "../src/semanticSearch.js";
import { getCachePath } from "../src/embeddingStore.js";
import { closePool } from "../src/mysql.js";

/**
 * Precompute Gemini embeddings for active listings.
 *
 * Usage:
 *   npm run embed:build -- --limit 500          # subset for development
 *   npm run embed:build                         # all active with remarks
 */

const args = process.argv.slice(2);
let limit: number | undefined;
let batchSize = 8;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit" && args[i + 1]) {
    limit = Number(args[i + 1]);
    i += 1;
  } else if (args[i] === "--batch" && args[i + 1]) {
    batchSize = Number(args[i + 1]);
    i += 1;
  }
}

if (limit != null && !Number.isFinite(limit)) {
  console.error("Invalid --limit value");
  process.exit(1);
}

try {
  console.error(
    `Building embedding index${limit != null ? ` (limit ${limit})` : " (all active with remarks)"}…`,
  );
  const cache = await buildEmbeddingIndex({
    limit,
    batchSize,
    onProgress: (done, total) => {
      if (done === total || done % 50 === 0) {
        console.error(`  embedded ${done}/${total}`);
      }
    },
  });
  console.log(
    JSON.stringify(
      {
        path: getCachePath(),
        model: cache.model,
        dimensions: cache.dimensions,
        count: cache.count,
        limit: cache.limit,
        builtAt: cache.builtAt,
      },
      null,
      2,
    ),
  );
} finally {
  await closePool();
}
