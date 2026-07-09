import { formatActiveListingCards, formatSoldCompCards } from "./formatPropertyCards.js";
import { getSoldComps, searchActiveListings } from "./mlsSearch.js";
import { parsePropertyQuery } from "./parsePropertyQuery.js";
import type { PropertyFilters, WeekThreeSearchResult } from "./mlsTypes.js";

export interface SearchOptions {
  page?: number;
  limit?: number;
  includeSoldComps?: boolean;
  soldMonths?: number;
}

export async function searchMlsData(
  queryText: string,
  options: SearchOptions = {},
): Promise<WeekThreeSearchResult> {
  const parsed = await parsePropertyQuery(queryText);
  const filters: PropertyFilters = { ...parsed };

  const activeResults = await searchActiveListings(filters, options.page ?? 1, options.limit ?? 10);
  const cards = formatActiveListingCards(activeResults.rows);

  if (options.includeSoldComps && filters.city) {
    const soldRows = await getSoldComps(filters.city, options.soldMonths ?? 12);
    cards.push(...formatSoldCompCards(soldRows));
  }

  return {
    query: queryText,
    filters,
    pagination: activeResults.pagination,
    cards,
  };
}
