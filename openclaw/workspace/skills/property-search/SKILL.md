---
name: property-search
description: "Parse free-text real estate queries, query MLS tables, and return formatted property cards."
---

# Property Search

Use when a user describes homes in natural language. This skill parses the query into structured filters, queries the MLS database, and returns formatted property cards for downstream agents.

## When to use

- User asks to find homes, condos, townhomes, or land
- User mentions city, price, bedrooms, bathrooms, sqft, pool, or view
- User wants active listings and/or recent sold comps in a city

## Commands

From the project root (load `.env` once per terminal session):

```bash
set -a; source .env; set +a
```

**Parse only (Week 2)** — structured filters, no database:

```bash
npm run parse -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

**Full search (Week 3)** — parse + query MLS + property cards:

```bash
npm run search:mls -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

## Supported query filters (active listings)

Any combination of these can appear in the user's natural-language query:

| Filter | Example phrases | DB column | Query logic |
|--------|-----------------|-----------|-------------|
| City | `in Irvine`, `in San Jose` | `L_City` | exact match |
| Max price | `under $1.5M`, `under 800k` | `L_SystemPrice` | `<=` max |
| Beds (min) | `3 bed`, `4-bedroom` | `L_Keyword2` | `>=` count |
| Baths (min) | `2 bath`, `2.5 bathroom` | `LM_Dec_3` | `>=` count |
| Sqft (min) | `1800 sqft`, `2200 square feet` | `LM_Int2_3` | `>=` size |
| Type | `condo`, `townhome`, `single family`, `land` | `L_Type_` | exact match |
| Pool | word `pool` | `PoolPrivateYN` | `= "True"` |
| View | word `view` | `ViewYN` | `= "True"` |

**Property type mapping:**

| User says | MLS value |
|-----------|-----------|
| condo | Condominium |
| townhome | Townhouse |
| single family | SingleFamilyResidence |
| land | UnimprovedLand |

**Always applied for active listings:**
- `L_Status = "Active"`
- Ordered by lowest price first
- Returns 10 results per page (default page 1)

## Sold comps behavior

Sold comps come from `california_sold` and are included **only when a city is parsed** from the query.

Sold comps filter by:
- City (exact match)
- Close date within last 12 months
- `PropertyType = "Residential"`
- Up to 50 results, ordered by most recent close date

Sold comps do **not** filter by beds, baths, price, pool, or view.

**Examples:**
- `"4 bedroom house"` → 10 active listings only
- `"4 bedroom house in San Jose"` → 10 active listings + up to 50 sold comps

## Environment variables

Required for `search:mls` (create `.env` in project root, never commit):

```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=idx_exchange
```

## Output shape

**Parser (`npm run parse`):**

```json
{
  "query": "...",
  "parsed": { "city": "Irvine", "maxPrice": 1500000, "beds": 3, "...": "..." },
  "retsFilters": { "L_City": "Irvine", "L_SystemPrice": 1500000, "...": "..." }
}
```

**MLS search (`npm run search:mls`):**

```json
{
  "query": "...",
  "filters": { "city": "Irvine", "maxPrice": 1500000, "beds": 3, "...": "..." },
  "pagination": { "page": 1, "limit": 10, "offset": 0 },
  "cards": [
    {
      "id": "...",
      "source": "active_listing",
      "headline": "Condominium in Irvine",
      "location": "123 Main St, Irvine, 92618",
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

## Source files

```
property-search/
├── SKILL.md                    # This file
├── src/
│   ├── parsePropertyQuery.ts   # Week 2 NLP parser
│   ├── mysql.ts                # MySQL connection pool
│   └── mlsSearch.ts            # Queries, formatting, orchestration
├── scripts/
│   ├── parse-query.ts          # Parse-only CLI
│   └── search-mls.ts           # Full search CLI
└── tests/
    ├── parsePropertyQuery.test.ts
    └── mlsSearch.test.ts
```
