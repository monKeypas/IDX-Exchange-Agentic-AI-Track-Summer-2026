import { query } from "./mysql.js";

export interface CompValidation {
  compPrice: number;
  listPrice: number;
  compCount: number;
  deltaPct: number | null;
  assessment: string;
}

/**
 * Validate a recommended list price against recent california_sold comps
 * in the same city (±20% living area, last 6 months).
 */
export async function validateWithComps(
  city: string,
  sqft: number,
  price: number,
): Promise<CompValidation> {
  const low = Math.max(1, Math.round(sqft * 0.8));
  const high = Math.round(sqft * 1.2);

  const rows = await query<{ avg_ppsf: number | string | null; comp_count: number | string }>(
    `
SELECT
  AVG(ClosePrice / NULLIF(LivingArea, 0)) AS avg_ppsf,
  COUNT(*) AS comp_count
FROM california_sold
WHERE City = ?
  AND PropertyType = 'Residential'
  AND LivingArea BETWEEN ? AND ?
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
`,
    [city, low, high],
  );

  const avgPpsf = Number(rows[0]?.avg_ppsf ?? 0) || 0;
  const compCount = Number(rows[0]?.comp_count ?? 0) || 0;
  const compPrice = Math.round(avgPpsf * sqft);
  let deltaPct: number | null = null;
  if (compPrice > 0) {
    deltaPct = Math.round(((price - compPrice) / compPrice) * 1000) / 10;
  }

  return {
    compPrice,
    listPrice: price,
    compCount,
    deltaPct,
    assessment: formatCompAssessment(compCount, deltaPct),
  };
}

export function formatCompAssessment(compCount: number, deltaPct: number | null): string {
  if (compCount === 0 || deltaPct == null) {
    return "Not enough recent comps to validate price";
  }
  const abs = Math.abs(deltaPct);
  if (abs <= 5) return "In line with recent comps";
  if (deltaPct > 5 && deltaPct <= 15) return "Somewhat above recent comps";
  if (deltaPct > 15) return "Well above recent comps";
  if (deltaPct < -5 && deltaPct >= -15) return "Somewhat below recent comps";
  return "Well below recent comps";
}
