import type { ParsedPropertyQuery } from "./parsePropertyQuery.js";

export interface PropertyFilters extends ParsedPropertyQuery {}

export interface ListingRow {
  L_ListingID: string;
  L_DisplayId: string | null;
  L_Address: string | null;
  L_City: string | null;
  L_Zip: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  type: string | null;
  status: string | null;
  lat: number | null;
  lng: number | null;
  YearBuilt: number | null;
  AssociationFee: number | null;
  DaysOnMarket: number | null;
  PoolPrivateYN: string | null;
  ViewYN: string | null;
  FireplaceYN: string | null;
  PhotoCount: number | null;
  LA1_UserFirstName: string | null;
  LA1_UserLastName: string | null;
  LO1_OrganizationName: string | null;
}

export interface SoldRow {
  ListingKey: string;
  UnparsedAddress: string | null;
  City: string | null;
  CloseDate: string;
  ClosePrice: number | null;
  OriginalListPrice: number | null;
  ListPrice: number | null;
  DaysOnMarket: number | null;
  BedroomsTotal: number | null;
  BathroomsTotalInteger: number | null;
  LivingArea: number | null;
  PropertyType: string | null;
  PropertySubType: string | null;
  YearBuilt: number | null;
  ListAgentFullName: string | null;
  ListOfficeName: string | null;
  BuyerOfficeName: string | null;
}

export interface PropertyCard {
  id: string;
  source: "active_listing" | "sold_comp";
  headline: string;
  location: string;
  price: string;
  facts: string[];
  badges: string[];
  agent: string | null;
  office: string | null;
  metadata: Record<string, string | number | null>;
}

export interface WeekThreeSearchResult {
  query: string;
  filters: PropertyFilters;
  pagination: {
    page: number;
    limit: number;
    offset: number;
  };
  cards: PropertyCard[];
}
