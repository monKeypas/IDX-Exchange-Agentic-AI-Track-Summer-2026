---
name: recommendations
description: "Hybrid listing recommendations — given a home the user likes (free text), return top 5 similar active listings using structured + embedding scores, with california_sold comp price checks. Use for “I like X, find similar” — not vibe-only search (semantic-search), structured filters (property-search), or market stats (market-stats)."
---

# Recommendations

Use when the user **likes a specific property / vibe example** and wants **similar active listings**, e.g.:

- `I like 257 Fay Way in Mountain View, find similar homes`
- `Recommend listings like a charming craftsman in Running Springs`

Do **not** invent listings. Always run the skill script and relay stdout.

## Prerequisites

1. MySQL `.env` (same as other skills)
2. Week 6 embedding cache built (`npm run embed:build`) — hybrid scoring reuses those vectors

## WhatsApp / OpenClaw workflow

```bash
cd <project-root> && npm run recommend -- "<USER_MESSAGE_TEXT>"
```

Send stdout back to WhatsApp (plain text). Returns **top 5** hybrid recommendations with sold-comp validation.

## How it works

1. Resolve the liked listing from free text (address match first, else semantic match on the Week 6 cache)
2. Score other active cached listings: **structured ~60%** (price / beds / city / sqft) + **embedding cosine ~40%**
3. For each top result, validate list price vs recent `california_sold` comps (±20% sqft, same city, 6 months)

## Commands

```bash
npm run recommend -- "I like 257 Fay Way in Mountain View, find similar homes"
npm run recommend -- --json "homes like a quiet cul-de-sac near parks"
```

## Source files

```
recommendations/
├── SKILL.md
├── src/
│   ├── resolveTarget.ts   # free text → liked listing
│   ├── hybridScore.ts     # handbook hybrid scorer
│   ├── comps.ts           # california_sold validation
│   ├── recommend.ts       # orchestrate + format
│   └── mysql.ts
├── scripts/
│   └── run-recommend.ts   # CLI entrypoint
└── tests/
```
