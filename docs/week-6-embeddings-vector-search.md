# Week 6 Deliverable — Embeddings & Vector Search

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Semantic property search over `rets_property` using **Gemini embeddings** and **cosine similarity**. A free-text vibe query (e.g. “charming craftsman with mountain views and character”) returns the **top 5** most similar active listings — even without exact keyword overlap.

Uses Google/Gemini (same key family as OpenClaw) instead of the handbook’s OpenAI sample; the math and deliverable are the same.

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
embed:build  →  fetch Active listings  →  Gemini embed (batched)
             →  save .embeddings/active-listings.json (gitignored)

search:semantic → embed query → cosine vs cache → top 5 cards
```

## How to Run

```bash
npm install

# Development subset (fast)
npm run embed:build -- --limit 500

# Full index (all active with remarks) — run when ready
npm run embed:build

npm test
npm run search:semantic -- "charming craftsman with mountain views and character"
```

API key resolution order: `GEMINI_API_KEY` / `GOOGLE_API_KEY` in `.env`, else OpenClaw `plugins.entries.google.config.webSearch.apiKey`.

## Key Files

| File | Role |
| --- | --- |
| `src/embeddings.ts` | Gemini `gemini-embedding-001` client |
| `src/cosine.ts` | Cosine similarity + ranking |
| `src/semanticSearch.ts` | Build index + search + format |
| `scripts/build-embeddings.ts` | Precompute cache |
| `scripts/search-semantic.ts` | CLI / WhatsApp entrypoint |
| `tests/*.test.ts` | Cosine + listing text + formatter |

## Continuity

Week 2–4 structured search stays in `property-search`. Week 6 is a separate skill for semantic/vibe queries so Gemini can route clearly; they can be merged later if desired.
