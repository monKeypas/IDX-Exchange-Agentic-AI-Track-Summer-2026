# Schema Annotation — Field Usage Notes

**IDX Exchange · Agentic AI Track · Summer 2026 · Team monKeypas**

Working notes on the two MLS tables this assistant queries: which columns we actually
use, what they turned out to mean, and the traps we hit. Derived from the queries in
`openclaw/workspace/skills/*/src/`.

---

## The headline: the two tables do not share a naming convention

This caused more bugs than anything else in the project.

| Concept | `rets_property` (active) | `california_sold` (closed) |
|---|---|---|
| City | `L_City` | `City` |
| Price | `L_SystemPrice` | `ClosePrice` (and `ListPrice`, `OriginalListPrice`) |
| Beds | `L_Keyword2` | `BedroomsTotal` |
| Baths | `LM_Dec_3` | `BathroomsTotalInteger` |
| Square feet | `LM_Int2_3` | `LivingArea` |
| Type | `L_Type_` | `PropertyType` / `PropertySubType` |
| Row filter | `L_Status = 'Active'` | `PropertyType = 'Residential'` + `CloseDate` window |

`rets_property` carries raw RETS-era names; `california_sold` uses RESO-standard names.
**`L_City` vs `City` is the single easiest mistake to make** — a cross-table join or a
copy-pasted `WHERE` clause fails silently or returns nothing.

---

## `rets_property` — active listings

Used by property search (Weeks 2–4), semantic search (6), recommendations (7), and
inventory counts in market stats (5).

### Filter columns

| Column | Holds | Notes |
|---|---|---|
| `L_City` | City name | We title-case user input before matching; MLS values are inconsistently cased |
| `L_Zip` | ZIP | Parsed from a bare 5-digit token in the query |
| `L_State`, `CountyOrParish`, `SubdivisionName` | Geography | County/subdivision matched with `LIKE %…%` — values are free text |
| `L_SystemPrice` | List price | The price we filter on. Range queries use `>=` / `<=` against it |
| `L_Keyword2` | Bedroom count | **Not obvious from the name.** Numeric-ish |
| `LM_Dec_3` | Bathroom count | Decimal — carries half-baths (2.5) |
| `LM_Int2_3` | Living area sqft | Integer |
| `L_Type_` | Property type | Mapped from natural language: condo → `Condominium`, townhome → `Townhouse`, single family → `SingleFamilyResidence`, land → `UnimprovedLand`. Trailing underscore is part of the name |
| `L_Status` | Listing status | Always `'Active'` for search |
| `YearBuilt`, `LotSizeSquareFeet`, `AssociationFee`, `HighSchoolDistrict` | Extras | RESO-style names inside an otherwise RETS-named table |

### Amenity flags are strings, not booleans

`PoolPrivateYN`, `ViewYN`, `FireplaceYN`, `GarageYN`, `SpaYN`, `AttachedGarageYN`,
`NewConstructionYN`.

These are **not** MySQL booleans. Observed values include `'True'`, `'1'`, and `'Yes'`,
with empties as `NULL`, `''`, `'0'`, `'False'`, or `'No'`. A naive `= 1` or `= true`
silently drops most matching rows. Every amenity filter goes through `ynClause()` in
`mlsSearch.ts`, which accepts all three truthy spellings.

### Filter columns ≠ display columns

The active-listing query **filters** on `L_Keyword2` / `LM_Dec_3` / `LM_Int2_3` but
**selects** `BedroomsTotal` / `BathroomsTotalInteger` / `LivingArea` for the property
cards. `rets_property` carries both sets. They are supposed to agree; where a row has one
populated and not the other, a card can show "beds N/A" even though the bed filter
matched it. Worth knowing before assuming a formatting bug.

### Text and identity

- `L_Remarks` — agent free-text description. This is the **only** field embedded for
  semantic search (Week 6); everything else in the embedding text is structured metadata.
- `L_ListingID`, `L_DisplayId` — identifiers. `L_DisplayId` is the human-facing MLS number.
- `L_Address` — street line only; we join it with `L_City` / `L_Zip` for display.
- `PhotoCount` — surfaced in cards because it is a decent proxy for listing quality.

---

## `california_sold` — closed sales

Used for market analytics (Week 5), comp validation (7), and grounding market answers in
RAG (8).

| Column | Holds | Notes |
|---|---|---|
| `City` | City | **Not** `L_City` |
| `ClosePrice` | Final sale price | The basis for medians, averages, and $/sqft |
| `ListPrice`, `OriginalListPrice` | Asking prices | `ClosePrice / ListPrice` gives list-to-close ratio |
| `CloseDate` | Sale date | Every query is windowed with `DATE_SUB(CURDATE(), INTERVAL ? MONTH)` |
| `DaysOnMarket` | DOM | Pre-computed; we don't derive it |
| `LivingArea` | Sqft | Always guarded — see below |
| `BedroomsTotal`, `BathroomsTotalInteger`, `YearBuilt` | Attributes | |
| `PropertyType` | `'Residential'` | Every analytics query filters on this to exclude land/commercial |
| `ListingKey`, `UnparsedAddress` | Identity | `UnparsedAddress` is the full one-line address |

### Two guards that matter

1. **`NULLIF(LivingArea, 0)`** — price-per-sqft is `ClosePrice / LivingArea`, and rows
   with zero or null sqft would divide by zero. Every $/sqft query wraps the denominator
   and adds `AND LivingArea > 0`.
2. **Comp bands** — comp validation only averages sales within ±20% of the subject's sqft
   and the last 6 months, so "comparable" means genuinely comparable rather than a
   city-wide average.

---

## Cross-table patterns

- **Inventory vs. absorption** (Week 5) counts active rows in `rets_property` against
  closed rows in `california_sold` for the same city — the one place both tables answer
  one question, and the one place the `L_City` / `City` split bites hardest.
- **Comp-validated pricing** (Week 7) takes a candidate from `rets_property`, then prices
  it against `california_sold` $/sqft for its city and size band.
- **Every query is parameterized.** All SQL goes through `query(sql, params)` with `?`
  placeholders — no string interpolation of user input anywhere.
- **Row cap.** MLS results are capped at 50 rows (`MAX_ROWS_PER_QUERY`), enforced in the
  query builders and again by `clampRows()` before anything reaches an email.

---

## Things we would verify before production

- Whether `L_Keyword2` is ever non-numeric — we coerce with `Number()` and have not seen
  it fail, but the column name suggests a generic keyword slot that may hold other data.
- Whether the duplicate bed/bath/sqft column pairs in `rets_property` can genuinely
  disagree, and which should win if so.
- The full domain of the `*YN` flags. We handle three truthy spellings; there may be more.
