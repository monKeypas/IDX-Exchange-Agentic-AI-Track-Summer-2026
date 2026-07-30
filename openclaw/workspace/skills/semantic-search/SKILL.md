---
name: semantic-search
description: "Semantic property search using Gemini embeddings + cosine similarity over rets_property remarks. Use for vibe/description queries like charming craftsman with mountain views — not structured bed/bath/price filters (use property-search) or market stats (use market-stats)."
---

# Semantic Search

Use when the user describes a home by **feel / features / style** rather than structured filters
(e.g. "charming craftsman with mountain views and character").

Do **not** invent listings. Always run the skill scripts and relay stdout.

## Prerequisites

1. MySQL `.env` (same as other skills)
2. Gemini API key — reused from OpenClaw Google config, or `GEMINI_API_KEY` in project `.env`
3. Precomputed embedding cache (gitignored):

```bash
# Dev subset
cd <project-root> && npm run embed:build -- --limit 500

# Full active listings with remarks (after development)
cd <project-root> && npm run embed:build
```

**Important:** If `.embeddings/active-listings.json` already exists, **do not** rebuild unless the user asks. Especially never run `embed:build -- --limit 1` — that overwrites the cache and search can only return one listing.
## WhatsApp / OpenClaw workflow

```bash
cd <project-root> && npm run search:semantic -- "<USER_MESSAGE_TEXT>"
```

Send stdout back to WhatsApp (plain text). Returns top 5 similar active listings.

## Examples

- `charming craftsman with mountain views and character`
- `quiet cul-de-sac near parks with a big backyard`
- `modern loft downtown with city lights`

## Commands

```bash
npm run embed:build -- --limit 500
npm run embed:build
npm run search:semantic -- "charming craftsman with mountain views"
npm run search:semantic -- --json "homes with ocean breeze vibe"
```

## Source files

```
semantic-search/
├── SKILL.md
├── .embeddings/            # local cache (gitignored)
├── src/
│   ├── embeddings.ts       # Gemini embed API
│   ├── cosine.ts           # similarity + top-k
│   ├── listingText.ts      # listing → embed text
│   ├── embeddingStore.ts   # load/save cache
│   ├── semanticSearch.ts   # build index + search
│   └── mysql.ts
├── scripts/
│   ├── build-embeddings.ts
│   └── search-semantic.ts
└── tests/
```
