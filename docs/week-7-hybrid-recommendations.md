# Week 7 Deliverable — Hybrid Recommendations

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Hybrid recommendation engine: given a listing a user likes (free text), surface the **top 5** similar **active** listings from `rets_property` using structured similarity + embedding cosine, then validate each recommendation’s price against recent **`california_sold`** comps.

Builds on Week 6 embeddings (local MiniLM cache by default) and Week 5 sold-data access patterns.

## Deliverable

| Requirement | Implementation |
| --- | --- |
| Structured similarity (price / beds / city / sqft) | `hybridScore.ts` |
| Embedding similarity (40 pts × cosine) | Reuses Week 6 cache + `cosine.ts` |
| Top 5 active recommendations | `recommend.ts` |
| Comp validation from `california_sold` | `comps.ts` |
| Free-text “I like …” entry | `resolveTarget.ts` + `npm run recommend` |
| OpenClaw skill | `skills/recommendations/` |

## Hybrid scoring (handbook)

- Price band: +20 / +12 / +5
- Same beds: +15
- Same city: +15
- Sqft band: +10 / +5
- Semantic: `cosine(target, candidate) * 40`

## Comp validation

Same city, Residential, living area within ±20%, close date within 6 months → average $/sqft × subject sqft, list vs comps `%` delta + plain-language assessment.

## How to Run

```bash
npm install
# Requires Week 6 cache (full or subset):
npm run embed:build -- --limit 500   # if cache missing
npm test
npm run recommend -- "I like 257 Fay Way in Mountain View, find similar homes"
```

## Key Files

| File | Role |
| --- | --- |
| `src/hybridScore.ts` | Structured + semantic hybrid score |
| `src/comps.ts` | `california_sold` price check |
| `src/resolveTarget.ts` | Free text → liked listing |
| `src/recommend.ts` | Rank top 5 + format reply |
| `scripts/run-recommend.ts` | CLI / WhatsApp entrypoint |

## Continuity

Week 6 answers vibe queries (“show me charming craftsman…”). Week 7 answers **similarity to a liked example** (“I like this one — what else?”) and adds sold-comp price context.
