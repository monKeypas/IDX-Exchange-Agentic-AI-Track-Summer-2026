---
name: semantic-search
description: "Semantic property search using local (or Gemini) embeddings + cosine similarity over rets_property remarks. Use for vibe/description queries like charming craftsman with mountain views — not structured bed/bath/price filters (use property-search) or market stats (use market-stats)."
---

# Semantic Search

Use when the user describes a home by **feel / features / style** rather than structured filters
(e.g. "charming craftsman with mountain views and character").

Do **not** invent listings. Always run the skill scripts and relay stdout.

## Prerequisites

1. MySQL `.env` (same as other skills)
2. Precomputed embedding cache (gitignored)
3. Embedding provider (default **local** — no API quota):
   - **local** (default): `@huggingface/transformers` + `Xenova/all-MiniLM-L6-v2` (downloads model once)
   - **gemini** (optional): set `EMBEDDING_PROVIDER=gemini` and provide a Gemini API key

```bash
# Dev subset
cd <project-root> && npm run embed:build -- --limit 500

# Full active listings with remarks
cd <project-root> && npm run embed:build
```

**Important:** If `.embeddings/active-listings.json` already exists, **do not** rebuild unless the user asks or the cache model does not match the current provider. Especially never run `embed:build -- --limit 1` — that overwrites the cache and search can only return one listing.

After switching providers (`local` ↔ `gemini`), rebuild the cache — vectors are not interchangeable.

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

# Optional Gemini path (uses API quota)
EMBEDDING_PROVIDER=gemini npm run embed:build -- --limit 500
```

## Source files

```
semantic-search/
├── SKILL.md
├── .embeddings/            # local cache (gitignored)
├── src/
│   ├── embeddings.ts       # local MiniLM (default) or Gemini
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
