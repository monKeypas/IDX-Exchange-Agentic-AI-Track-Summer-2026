---
name: property-search
description: "Parse free-text real estate queries into structured MLS filter objects."
---

# Property Search

Use when a user describes homes in natural language and you need structured filters for `rets_property`.

## Workflow

1. Take the user's free-text query.
2. Run the parser script with the full query string.
3. Return both the parsed object and the `rets_property` column mapping.

```bash
npm run parse -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

## Output shape

The script returns JSON:

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
