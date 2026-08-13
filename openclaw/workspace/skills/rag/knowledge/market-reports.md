# Market Reports — Week 5 Analytics Definitions

How to read reports produced by the Week 5 market-stats agent. Live city numbers are NOT in this file — RAG fetches them at query time by calling `answerMarketQuestion` (the market analytics agent) and inserting that report into context.

## What the market analytics agent reports

For a California city (optional ZIP / property subtype) over a lookback window (default 12 months of california_sold residential closes):

1. Sold count — how many matching sales closed in the window.
2. Median close price — middle ClosePrice (less skewed by mansions than the average).
3. Average close price — mean ClosePrice.
4. Average price per sq ft — mean of ClosePrice / LivingArea (LivingArea > 0).
5. Average DOM — mean DaysOnMarket.
6. List-to-close ratio — mean ClosePrice / ListPrice × 100.
7. Monthly trend — sales and average price by month, with month-over-month % change.
8. Year-over-year — last 12 months vs the prior 12 months for price, DOM, and sales volume.
9. Active inventory — count of rets_property rows with L_Status = Active in that city.
10. Months of inventory — active listings relative to the sold pace.

## How to read the report

- Rising median/avg prices + falling DOM + list-to-close near or above 100% usually means a stronger seller’s market.
- Falling prices + rising DOM + list-to-close well below 100% usually means more buyer leverage.
- Months of inventory: roughly under 3 = tight / seller-favored; 4–6 more balanced; higher = more supply.

## Example question mapping

- “What is a list-to-close ratio?” → ClosePrice / ListPrice as a percent; Week 5 prints it as list-to-close.
- “What does DOM mean?” → Days on Market; Week 5 averages DaysOnMarket from california_sold.
- “What columns are in california_sold?” → see MLS field definitions; Week 5 mainly uses City, CloseDate, ClosePrice, ListPrice, LivingArea, DaysOnMarket, PropertyType, PropertySubType, PostalCode.

## Limits

This file is definitions only. When the user names a city (e.g. “What is DOM in San Diego?”), RAG must source the live report via the Week 5 market analytics agent and use those numbers. Do not invent city statistics.
