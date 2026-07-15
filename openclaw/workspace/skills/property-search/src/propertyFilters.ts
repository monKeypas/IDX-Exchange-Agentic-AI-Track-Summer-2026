/** Structured filters mapped to rets_property columns. */
export interface PropertyFilters {
  city: string | null;
  zip: string | null;
  state: string | null;
  county: string | null;
  subdivision: string | null;

  minPrice: number | null;
  maxPrice: number | null;

  bedsMin: number | null;
  bedsMax: number | null;
  bathsMin: number | null;
  sqftMin: number | null;
  lotSqftMin: number | null;

  type: string | null;
  yearBuiltMin: number | null;
  yearBuiltMax: number | null;
  newConstruction: boolean | null;

  pool: boolean | null;
  view: boolean | null;
  fireplace: boolean | null;
  garage: boolean | null;
  spa: boolean | null;
  attachedGarage: boolean | null;

  maxHoa: number | null;
  highSchoolDistrict: string | null;

  /** Search L_Remarks (FULLTEXT) and View/LotFeatures (LIKE). */
  keywords: string | null;

  maxDaysOnMarket: number | null;
}

export function emptyPropertyFilters(): PropertyFilters {
  return {
    city: null,
    zip: null,
    state: null,
    county: null,
    subdivision: null,
    minPrice: null,
    maxPrice: null,
    bedsMin: null,
    bedsMax: null,
    bathsMin: null,
    sqftMin: null,
    lotSqftMin: null,
    type: null,
    yearBuiltMin: null,
    yearBuiltMax: null,
    newConstruction: null,
    pool: null,
    view: null,
    fireplace: null,
    garage: null,
    spa: null,
    attachedGarage: null,
    maxHoa: null,
    highSchoolDistrict: null,
    keywords: null,
    maxDaysOnMarket: null,
  };
}

function ynClause(column: string, value: boolean): string {
  return value
    ? ` AND (${column} = 'True' OR ${column} = '1' OR ${column} = 'Yes')`
    : ` AND (${column} IS NULL OR ${column} = '' OR ${column} = '0' OR ${column} = 'False' OR ${column} = 'No')`;
}

/** Append parameterized WHERE clauses for active listing search. */
export function appendPropertyFilterClauses(
  filters: PropertyFilters,
  params: unknown[],
): string {
  let sql = "";

  if (filters.city) {
    sql += " AND L_City = ?";
    params.push(filters.city);
  }
  if (filters.zip) {
    sql += " AND L_Zip = ?";
    params.push(filters.zip);
  }
  if (filters.state) {
    sql += " AND L_State = ?";
    params.push(filters.state);
  }
  if (filters.county) {
    sql += " AND CountyOrParish LIKE ?";
    params.push(`%${filters.county}%`);
  }
  if (filters.subdivision) {
    sql += " AND SubdivisionName LIKE ?";
    params.push(`%${filters.subdivision}%`);
  }
  if (filters.minPrice != null) {
    sql += " AND L_SystemPrice >= ?";
    params.push(filters.minPrice);
  }
  if (filters.maxPrice != null) {
    sql += " AND L_SystemPrice <= ?";
    params.push(filters.maxPrice);
  }
  if (filters.bedsMin != null && filters.bedsMax != null && filters.bedsMin === filters.bedsMax) {
    sql += " AND L_Keyword2 = ?";
    params.push(filters.bedsMin);
  } else {
    if (filters.bedsMin != null) {
      sql += " AND L_Keyword2 >= ?";
      params.push(filters.bedsMin);
    }
    if (filters.bedsMax != null) {
      sql += " AND L_Keyword2 <= ?";
      params.push(filters.bedsMax);
    }
  }
  if (filters.bathsMin != null) {
    sql += " AND LM_Dec_3 >= ?";
    params.push(filters.bathsMin);
  }
  if (filters.sqftMin != null) {
    sql += " AND LM_Int2_3 >= ?";
    params.push(filters.sqftMin);
  }
  if (filters.lotSqftMin != null) {
    sql += " AND LotSizeSquareFeet >= ?";
    params.push(filters.lotSqftMin);
  }
  if (filters.type) {
    sql += " AND L_Type_ = ?";
    params.push(filters.type);
  }
  if (filters.yearBuiltMin != null) {
    sql += " AND YearBuilt >= ?";
    params.push(filters.yearBuiltMin);
  }
  if (filters.yearBuiltMax != null) {
    sql += " AND YearBuilt <= ?";
    params.push(filters.yearBuiltMax);
  }
  if (filters.newConstruction === true) {
    sql += ynClause("NewConstructionYN", true);
  }
  if (filters.pool === true) sql += ynClause("PoolPrivateYN", true);
  if (filters.view === true) sql += ynClause("ViewYN", true);
  if (filters.fireplace === true) sql += ynClause("FireplaceYN", true);
  if (filters.garage === true) sql += ynClause("GarageYN", true);
  if (filters.spa === true) sql += ynClause("SpaYN", true);
  if (filters.attachedGarage === true) sql += ynClause("AttachedGarageYN", true);
  if (filters.maxHoa != null) {
    sql += " AND AssociationFee <= ?";
    params.push(filters.maxHoa);
  }
  if (filters.highSchoolDistrict) {
    sql += " AND HighSchoolDistrict LIKE ?";
    params.push(`%${filters.highSchoolDistrict}%`);
  }
  if (filters.maxDaysOnMarket != null) {
    sql += " AND DaysOnMarket <= ?";
    params.push(filters.maxDaysOnMarket);
  }
  if (filters.keywords) {
    const term = filters.keywords.trim();
    sql += ` AND (
      MATCH(L_Remarks) AGAINST (? IN BOOLEAN MODE)
      OR View LIKE ?
      OR LotFeatures LIKE ?
      OR CommunityFeatures LIKE ?
    )`;
    params.push(`${term}*`, `%${term}%`, `%${term}%`, `%${term}%`);
  }

  return sql;
}
