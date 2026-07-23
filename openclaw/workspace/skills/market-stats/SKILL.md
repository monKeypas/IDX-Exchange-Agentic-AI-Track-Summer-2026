---
name: market-stats
description: "Answer California market questions from california_sold — median/avg price, $/sqft, DOM, list-to-close ratio, monthly trends, YoY, and active inventory."
---

# Market Stats

Use when the user asks about market conditions, trends, or whether it’s a good time to buy — not for finding specific listings (use `property-search` for that).

## WhatsApp / OpenClaw workflow

1. Identify the question (city required).
2. From the **git project root** (folder with `package.json`), run:

```bash
cd <project-root> && npm run market -- "<USER_MESSAGE_TEXT>"
```

3. Send the script stdout back to the user (plain text — no markdown tables).
4. Do **not** invent stats. Always run the script.

## Example questions

- `Is now a good time to buy in San Diego?`
- `What is the average price per sq ft in Pasadena?`
- `Market stats for Irvine`
- `24 month price trends for Oakland`
- `Inventory in San Jose`

## Metrics returned

For a city (optional zip / property subtype):

- sold count (last N months, default 12)
- median + average close price
- average price per sq ft
- average days on market
- list-to-close ratio (%)
- recent monthly trend (MoM % change)
- year-over-year avg price / DOM / sales
- active listing count (`rets_property`) vs sold volume + months of inventory

## Commands

```bash
# WhatsApp-ready text summary
npm run market -- "Is now a good time to buy in San Diego?"

# Structured JSON
npm run market -- --json "avg price per sq ft in Pasadena"
```

## Environment variables

Same project-root `.env` as property-search:

```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=idx_exchange
```

## Source files

```
market-stats/
├── SKILL.md
├── src/
│   ├── parseMarketQuery.ts   # NL → city / intent / months
│   ├── mysql.ts              # MySQL pool
│   └── marketStats.ts        # SQL + summaries + formatter
├── scripts/
│   └── market-stats.ts
└── tests/
```
