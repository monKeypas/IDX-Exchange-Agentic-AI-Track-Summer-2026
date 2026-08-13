# Real Estate Terminology Glossary

Plain-language definitions used by IDX Exchange agents and California MLS data.

## DOM (Days on Market)

DOM means Days on Market: how many days a listing was (or has been) publicly on the market. In `california_sold` the column is DaysOnMarket (time until the sale went pending/closed). In `rets_property` DaysOnMarket is the current listing’s DOM; CumulativeDaysOnMarket sums across listing cycles. Lower DOM often signals stronger demand; higher DOM can mean a slower market or an overpriced listing. Week 5 reports average DOM for a city.

## Escrow

Escrow is a neutral third-party process that holds funds and documents until a home sale closes. After an offer is accepted, the deal typically goes into escrow: inspections, appraisal, loan approval, title, and signed disclosures happen before CloseDate. “In escrow” is not the same as closed.

## Comps (Comparables)

Comps are recently sold similar properties used to estimate value. Week 7 validates a recommended list price using california_sold sales in the same city, similar living area (±20% sqft), and CloseDate within 6 months. Average sold $/sqft × subject sqft is the estimated comp price. List vs comps % says whether the asking price is above or below that estimate.

## Cap rate (Capitalization rate)

Cap rate is a rental / investment metric: Net Operating Income ÷ purchase price (or value). Example: $40,000 NOI on a $1,000,000 property is a 4% cap rate. Higher cap rate usually means higher income relative to price (and often higher risk or a weaker location). Cap rate is not stored as a column in rets_property or california_sold; those tables are residential MLS sales/listings, not income statements.

## List-to-close ratio

List-to-close ratio (also called sale-to-list ratio) is ClosePrice divided by ListPrice, expressed as a percent. Week 5 computes AVG(ClosePrice / ListPrice) × 100 for residential sales in a city. About 100% means homes sold near asking. Above 100% means buyers paid over list (competitive). Below 100% means sellers typically conceded from list price.

## List price vs close price vs original list price

ListPrice / L_SystemPrice is the asking price. ClosePrice is what the buyer paid. OriginalListPrice is the first ask. A cut from original list to final list often shows the listing had to reprice.

## PPSF (Price per square foot)

Price per square foot is price divided by LivingArea (or LM_Int2_3 on active listings). Week 5 uses average ClosePrice / LivingArea. Useful for comparing different-sized homes in the same city.

## MLS

Multiple Listing Service: the shared database of listings that agents use. IDX (Internet Data Exchange) is how those listings can be displayed on public sites. This project’s `rets_property` table is the MLS active feed.

## Pending / Active / Closed / Contingent

Active: currently for sale (rets_property L_Status = Active). Pending: offer accepted, typically in escrow. Closed: sale recorded (california_sold). Contingent: under contract but still has conditions (inspection, loan, etc.).

## HOA / Association fee

AssociationFee is the homeowners association (HOA) or similar periodic fee. AssociationYN indicates whether an association exists. Common for condos and planned communities.

## Disclosure

Sellers in California generally must provide written property disclosures (see the California law summary document). Disclosures are legal notices, not MLS marketing remarks (L_Remarks).

## Inventory / months of inventory

Active inventory is the count of Active listings in rets_property for a city. Months of inventory ≈ active listings ÷ (sold count / months in the window). Roughly: under 3 months is a seller’s market; around 4–6 is more balanced; higher is a buyer’s market. Week 5 reports this.

## CMA (Comparative Market Analysis)

A CMA is an agent’s value estimate using comps — similar to Week 7’s sold-comp check, but usually more judgment (condition, upgrades, exact neighborhood).
