# MLS Field Definitions

Authoritative column mappings for IDX Exchange MySQL tables `rets_property` (active listings) and `california_sold` (closed sales).

## california_sold columns

`california_sold` stores historical closed residential sales used for comps and market analytics.

Complete california_sold column list: ListingKey, ViewYN, WaterfrontYN, BasementYN, PoolPrivateYN, OriginalListPrice, CloseDate, ClosePrice, ListAgentFirstName, ListAgentLastName, Latitude, Longitude, UnparsedAddress, PropertyType, LivingArea, ListPrice, DaysOnMarket, ListOfficeName, BuyerOfficeName, ListAgentFullName, BuyerAgentFirstName, BuyerAgentLastName, AttachedGarageYN, ParkingTotal, PropertySubType, LotSizeAcres, SubdivisionName, YearBuilt, BathroomsTotalInteger, City, BedroomsTotal, PurchaseContractDate, ListingContractDate, StateOrProvince, MiddleOrJuniorSchool, FireplaceYN, Stories, HighSchool, Levels, MainLevelBedrooms, NewConstructionYN, GarageSpaces, HighSchoolDistrict, PostalCode, AssociationFee, LotSizeSquareFeet.

Key meanings: ListingKey is the sold listing id. UnparsedAddress is the full street address. City and PostalCode filter market stats and comps. PropertyType is typically Residential in Week 5/7. CloseDate / ClosePrice are the sale date and sold price. ListPrice is the last ask; OriginalListPrice is the first ask. DaysOnMarket is DOM until pending/closed. LivingArea is interior sqft. BedroomsTotal and BathroomsTotalInteger are bed/bath counts.

Week 5 market stats use ClosePrice, LivingArea, DaysOnMarket, ListPrice, City, PostalCode, PropertyType, PropertySubType, and CloseDate. Week 7 comps use City, PropertyType, LivingArea, ClosePrice, and CloseDate (last 6 months).

## rets_property columns

`rets_property` stores current MLS listings (active inventory). Many column names are RETS-coded.

- L_ListingID: unique listing id
- L_DisplayId: MLS display / public id
- L_Address: street address
- L_AddressStreet: street name portion
- L_City: city
- L_State: state
- L_Zip: ZIP code
- L_Status: listing status (Active for live inventory)
- L_Type_: property type / subtype label
- L_Class: listing class
- L_SystemPrice: current list price
- L_Keyword2: bedrooms
- LM_Dec_3: bathrooms
- LM_Int2_3: living area square footage
- L_Remarks: public remarks / marketing description (used for Week 6 embeddings)
- PhotoCount: number of photos
- YearBuilt: year built
- DaysOnMarket: days on market for the active listing
- CumulativeDaysOnMarket: cumulative DOM across listing cycles
- AssociationFee, AssociationFeeFrequency, AssociationYN: HOA
- PoolPrivateYN, ViewYN, FireplaceYN, SpaYN, GarageYN, CoolingYN, HeatingYN: feature flags
- LMD_MP_Latitude, LMD_MP_Longitude: coordinates
- LA1_UserFirstName, LA1_UserLastName: listing agent name
- LO1_OrganizationName: listing office
- PreviousListPrice: prior list price
- OnMarketDate, BackOnMarketDate, ListingContractDate: listing timeline
- LotSizeSquareFeet, LotSizeAcres, LotSizeArea: lot size
- Flooring, Fencing, Appliances: property details
- LivingAreaUnits, LivingAreaSource, LotSizeUnits: unit metadata

Week 3–4 search uses L_City, L_Zip, L_SystemPrice, L_Keyword2, L_Type_, L_Status, L_Remarks, PhotoCount.
Week 6 embeddings use L_Type_, L_City, L_Keyword2, LM_Dec_3, LM_Int2_3, YearBuilt, L_SystemPrice, L_Remarks.
Week 7 hybrid scoring uses L_SystemPrice, L_Keyword2, L_City, LM_Int2_3 plus Week 6 embeddings.
