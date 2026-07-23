# Week 3 Deliverable — MLS Database Integration

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Connects Week 2 NLP filters to MySQL (`rets_property`, `california_sold`) with parameterized queries, pagination, and formatted property cards.

## Deliverable

| Requirement | Implementation |
| --- | --- |
| MySQL connection pool | `mysql.ts` |
| Parameterized active listing query | `buildActiveListingsQuery` / `searchActiveListings` |
| Sold comps query | `buildSoldCompsQuery` / `getSoldComps` |
| Formatted property cards | `searchMlsData` → JSON cards |
| One-shot CLI | `scripts/search-mls.ts` |

### Flow

```text
natural language → parsePropertyQuery → SQL filters → rets_property (+ optional california_sold) → property cards
```

### Sold comps

Controlled by `INCLUDE_SOLD_COMPS` in `src/mlsSearch.ts` (default: **off**). When enabled and a city is present, up to 50 recent residential comps from `california_sold` are appended.

## How to Run

**Prerequisites:** MySQL with `idx_exchange` imported (Week 0). Project-root `.env`:

```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=idx_exchange
```

```bash
npm install
npm test
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"
```

Returns JSON with `filters`, `pagination`, and `cards`.

## Key Files

| File | Role |
| --- | --- |
| `src/parsePropertyQuery.ts` | NLP → structured filters |
| `src/mysql.ts` | Pool + `query()` |
| `src/mlsSearch.ts` | Queries, cards, `INCLUDE_SOLD_COMPS` |
| `scripts/search-mls.ts` | CLI entrypoint |
| `tests/mlsSearch.test.ts` | SQL builder tests |

## Continuity

Week 2 provided the parser. Week 4 wraps this search layer in session memory and multi-turn WhatsApp replies (active listings only).
