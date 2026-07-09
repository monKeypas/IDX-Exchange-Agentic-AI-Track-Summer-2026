import type { ListingRow, PropertyCard, SoldRow } from "./mlsTypes.js";

function formatCurrency(amount: number | null): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

function buildAddress(address: string | null, city: string | null, zip: string | null): string {
  return [address, city, zip].filter(Boolean).join(", ") || "Address unavailable";
}

export function formatActiveListingCards(rows: ListingRow[]): PropertyCard[] {
  return rows.map((row) => {
    const agentName = [row.LA1_UserFirstName, row.LA1_UserLastName].filter(Boolean).join(" ").trim();
    const badges = [
      row.PoolPrivateYN === "True" ? "Pool" : null,
      row.ViewYN === "True" ? "View" : null,
      row.FireplaceYN === "True" ? "Fireplace" : null,
      row.PhotoCount ? `${row.PhotoCount} photos` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      id: row.L_ListingID,
      source: "active_listing",
      headline: `${row.type ?? "Property"} in ${row.L_City ?? "Unknown City"}`,
      location: buildAddress(row.L_Address, row.L_City, row.L_Zip),
      price: formatCurrency(row.price),
      facts: [
        `${formatNumber(row.beds)} bd`,
        `${formatNumber(row.baths)} ba`,
        `${formatNumber(row.sqft)} sqft`,
        row.YearBuilt ? `Built ${row.YearBuilt}` : "Year built N/A",
        row.DaysOnMarket != null ? `${row.DaysOnMarket} DOM` : "DOM N/A",
      ],
      badges,
      agent: agentName || null,
      office: row.LO1_OrganizationName,
      metadata: {
        displayId: row.L_DisplayId,
        status: row.status,
        latitude: row.lat,
        longitude: row.lng,
        hoaFee: row.AssociationFee,
      },
    };
  });
}

export function formatSoldCompCards(rows: SoldRow[]): PropertyCard[] {
  return rows.map((row) => ({
    id: row.ListingKey,
    source: "sold_comp",
    headline: `${row.PropertySubType ?? row.PropertyType ?? "Residential"} comp`,
    location: [row.UnparsedAddress, row.City].filter(Boolean).join(", ") || "Address unavailable",
    price: formatCurrency(row.ClosePrice),
    facts: [
      `${formatNumber(row.BedroomsTotal)} bd`,
      `${formatNumber(row.BathroomsTotalInteger)} ba`,
      `${formatNumber(row.LivingArea)} sqft`,
      row.YearBuilt ? `Built ${row.YearBuilt}` : "Year built N/A",
      row.DaysOnMarket != null ? `${row.DaysOnMarket} DOM` : "DOM N/A",
    ],
    badges: [row.CloseDate ? `Closed ${row.CloseDate}` : null].filter(
      (item): item is string => Boolean(item),
    ),
    agent: row.ListAgentFullName,
    office: row.ListOfficeName,
    metadata: {
      buyerOffice: row.BuyerOfficeName,
      listPrice: row.ListPrice,
      originalListPrice: row.OriginalListPrice,
      closeDate: row.CloseDate,
    },
  }));
}
