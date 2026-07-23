# Week 5 Deliverable — Market Statistics Agent

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

OpenClaw skill that answers California market questions from `california_sold` (historical comps) with data-backed summaries: **median price, DOM, list-to-close ratio, and 12-month trend** for any city — plus $/sqft, YoY, and active inventory vs sold volume.

Builds on Week 3 MySQL access; separate skill from property listing search.

## Deliverable

| Requirement | Implementation |
| --- | --- |
| Market analytics from `california_sold` | `marketStats.ts` |
| Median / avg close, DOM, list-to-close | City summary + median query |
| 12-month trend | Monthly group-by + MoM `%` |
| YoY comparison | Last 12 months vs prior 12 |
| Inventory vs sold volume | `rets_property` active count + sold count |
| OpenClaw skill | `skills/market-stats/` |
| Natural-language questions | `parseMarketQuery.ts` |

### Example

```text
Input:  Is now a good time to buy in San Diego?
Output: Market stats — San Diego (last 12 months, residential)
        • Median close / avg close / $/sqft / DOM / list-to-close
        • YoY + recent monthly trend
        • Active inventory + months of inventory
        • Short data-backed take (not financial advice)
```

## How to Run

Same `.env` as Weeks 3–4.

```bash
npm install
npm test
npm run market -- "Is now a good time to buy in San Diego?"
npm run market -- "What is the average price per sq ft in Pasadena?"
npm run market -- --json "market stats for Irvine"
```

## Key Files

| File | Role |
| --- | --- |
| `src/parseMarketQuery.ts` | Parse city, zip, months, intent |
| `src/marketStats.ts` | Parameterized SQL + formatting |
| `src/mysql.ts` | Connection pool |
| `scripts/market-stats.ts` | CLI / WhatsApp entrypoint |
| `tests/*.test.ts` | Parser + SQL builder + formatter tests |

## Continuity

Week 3 introduced `california_sold` comps. Week 5 turns that table into a market analytics skill. Listing search remains in `property-search`.
