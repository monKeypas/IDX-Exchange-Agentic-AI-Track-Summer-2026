#!/usr/bin/env npx tsx
import { indexDocuments } from "../src/retrieve.js";
import { getIndexPath } from "../src/ragStore.js";

/**
 * Chunk + embed knowledge docs into a local RAG index.
 *
 * Usage:
 *   npm run rag:index
 */

try {
  console.error("Indexing RAG knowledge documents…");
  const index = await indexDocuments();
  console.log(
    JSON.stringify(
      {
        path: getIndexPath(),
        model: index.model,
        dimensions: index.dimensions,
        count: index.count,
        builtAt: index.builtAt,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
