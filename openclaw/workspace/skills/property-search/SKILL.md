---
name: property-search
description: "Parse free-text real estate queries, query MLS tables, and return property cards."
---

# Property Search

Use when a user describes homes in natural language and you need structured filters, MLS queries, and card-ready output.

## Workflow

1. Take the user's free-text query.
2. Run the parser script when only filters are needed.
3. Run the MLS search script to query `rets_property` and optionally `california_sold`.
4. Return formatted property cards for downstream agents.

```bash
npm run parse -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

```bash
npm run search:mls -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

## Output shape

The parser script returns JSON:

```json
{
  "query": "...",
  "parsed": {
    "city": "Irvine",
    "maxPrice": 1500000,
    "beds": 3,
    "baths": null,
    "sqft": null,
    "type": "Condominium",
    "pool": "True",
    "hasView": null
  },
  "retsFilters": {
    "L_City": "Irvine",
    "L_SystemPrice": 1500000,
    "L_Keyword2": 3,
    "L_Type_": "Condominium",
    "PoolPrivateYN": "True"
  }
}
```

The MLS script returns:

```json
{
  "query": "...",
  "filters": {
    "city": "Irvine",
    "maxPrice": 1500000,
    "beds": 3,
    "baths": null,
    "sqft": null,
    "type": "Condominium",
    "pool": "True",
    "hasView": null
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "offset": 0
  },
  "cards": [
    {
      "id": "...",
      "source": "active_listing",
      "headline": "...",
      "location": "...",
      "price": "$1,250,000",
      "facts": ["3 bd", "2 ba", "1,650 sqft", "Built 2005", "12 DOM"],
      "badges": ["Pool", "18 photos"],
      "agent": "...",
      "office": "...",
      "metadata": {}
    }
  ]
}
```

## Environment variables

Set these before running MLS queries:

- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

## Week 3 deliverable checklist

- Parameterized MySQL query layer in `src/mysql.ts` and `src/mlsSearch.ts`
- Active listing query against `rets_property`
- Sold comps query against `california_sold`
- NLP filters from Week 2 parser (`src/parsePropertyQuery.ts`)
- Formatted card output (`src/formatPropertyCards.ts`)

## Filter mapping

| Parsed field | `rets_property` column |
|--------------|------------------------|
| `city` | `L_City` |
| `maxPrice` | `L_SystemPrice` |
| `beds` | `L_Keyword2` |
| `baths` | `LM_Dec_3` |
| `sqft` | `LM_Int2_3` |
| `type` | `L_Type_` |
| `pool` | `PoolPrivateYN` |
| `hasView` | `ViewYN` |
