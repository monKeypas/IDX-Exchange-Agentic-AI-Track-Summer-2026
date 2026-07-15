# Week 2 Deliverable — Natural Language Property Search

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

OpenClaw skill that turns free-text real estate queries into structured filter objects mapped to `rets_property` columns. No database calls yet — parsing and mapping only.

Builds on **Week 1** architecture (property-search skill as the handler for listing queries).

## Deliverable

| Requirement | Implementation |
| --- | --- |
| Parse natural-language queries | `parsePropertyQuery.ts` |
| Map filters → `rets_property` columns | `toRetsFilters()` |
| OpenClaw skill | `skills/property-search/SKILL.md` |
| Validation tests | `tests/parsePropertyQuery.test.ts` |

### Example

```text
Input:  "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
Output: { city: "Irvine", maxPrice: 1500000, bedsMin: 3, type: "Condominium", pool: true, ... }
```

## How to Run

```bash
npm install
npm test
npm run parse -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

## Key Files

| File | Role |
| --- | --- |
| `src/parsePropertyQuery.ts` | NLP → structured filters |
| `scripts/parse-query.ts` | CLI entrypoint |
| `tests/parsePropertyQuery.test.ts` | Parser tests |
| `SKILL.md` | OpenClaw skill instructions |

## Continuity

Week 3 connects these filters to MySQL. Week 4 reuses the same parser inside multi-turn conversation.
