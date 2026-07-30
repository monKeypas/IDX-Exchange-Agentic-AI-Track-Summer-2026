export interface ListingForEmbedding {
  L_ListingID: string;
  L_DisplayId: string | null;
  L_Address: string | null;
  L_City: string | null;
  L_Zip: string | null;
  L_Type_: string | null;
  L_SystemPrice: number | null;
  L_Keyword2: number | null;
  LM_Dec_3: number | null;
  LM_Int2_3: number | null;
  YearBuilt: number | null;
  L_Remarks: string | null;
  PhotoCount: number | null;
}

/** Handbook-style text blob used for listing embeddings. */
export function buildListingEmbeddingText(row: ListingForEmbedding): string {
  const type = row.L_Type_ ?? "Property";
  const city = row.L_City ?? "Unknown City";
  const beds = row.L_Keyword2 != null ? `${row.L_Keyword2} beds` : "beds N/A";
  const baths = row.LM_Dec_3 != null ? `${row.LM_Dec_3} baths` : "baths N/A";
  const sqft = row.LM_Int2_3 != null ? `${row.LM_Int2_3} sq ft` : "sqft N/A";
  const year = row.YearBuilt != null ? `Built ${row.YearBuilt}.` : "";
  const price =
    row.L_SystemPrice != null
      ? `Price: $${Math.round(row.L_SystemPrice).toLocaleString("en-US")}.`
      : "";
  const remarks = (row.L_Remarks ?? "").replace(/\s+/g, " ").trim();

  return `
${type} in ${city}, CA.
${beds}, ${baths}.
${sqft}. ${year}
${price}
${remarks}
`.trim();
}
