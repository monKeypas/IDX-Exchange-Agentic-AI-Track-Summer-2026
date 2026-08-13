# Week 6 Deliverable — Embeddings & Vector Search

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Semantic property search over `rets_property` using **embeddings** and **cosine similarity**. A free-text vibe query (e.g. “charming craftsman with mountain views and character”) returns the **top 5** most similar active listings — even without exact keyword overlap.

**Default provider is local** (`Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`) so index builds do not burn Gemini API quota. Gemini remains available with `EMBEDDING_PROVIDER=gemini`.

## Deliverable

| Requirement | Implementation |
| --- | --- |
| Embed listing text (type, city, beds/baths, sqft, year, price, remarks) | `listingText.ts` + `embeddings.ts` |
| Cosine similarity top-5 | `cosine.ts` + `semanticSearch.ts` |
| Active listings from `rets_property` | MySQL fetch + local embedding cache |
| OpenClaw skill | `skills/semantic-search/` |
| Free-text → ranked listings | `npm run search:semantic` |

## Architecture

```text
embed:build  →  fetch Active listings  →  local MiniLM embed (batched; no API quota)
             →  save .embeddings/active-listings.json (gitignored)

search:semantic → embed query (same model) → cosine vs cache → top 5 cards
```

Listing vectors and query vectors **must** use the same model. Switching `local` ↔ `gemini` requires a rebuild.

## How to Run

```bash
npm install

# Development subset (fast)
npm run embed:build -- --limit 500

# Full index (all active with remarks) — no API quota on local
npm run embed:build

npm test
npm run search:semantic -- "charming craftsman with mountain views and character"
```

Optional Gemini path:

```bash
EMBEDDING_PROVIDER=gemini npm run embed:build -- --limit 500
```

Gemini key resolution (only when `EMBEDDING_PROVIDER=gemini`): `GEMINI_API_KEY` / `GOOGLE_API_KEY` in `.env`, else OpenClaw `plugins.entries.google.config.webSearch.apiKey`.

## Key Files

| File | Role |
| --- | --- |
| `src/embeddings.ts` | Local MiniLM (default) or Gemini `gemini-embedding-001` |
| `src/cosine.ts` | Cosine similarity + ranking |
| `src/semanticSearch.ts` | Build index + search + format |
| `scripts/build-embeddings.ts` | Precompute cache |
| `scripts/search-semantic.ts` | CLI / WhatsApp entrypoint |
| `tests/*.test.ts` | Cosine + listing text + local embed shape |

## Continuity

Week 2–4 structured search stays in `property-search`. Week 6 is a separate skill for semantic/vibe queries so Gemini can route clearly; they can be merged later if desired. Week 7 (`recommendations`) builds on this cache for hybrid “homes like this” scoring.
