import { clampRows } from "./guardrails.js";

function esc(value: string | number | null | undefined): string {
  if (value == null) return "N/A";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface ListingCardInput {
  L_Address?: string | null;
  L_City?: string | null;
  L_Zip?: string | null;
  price?: number | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  PhotoCount?: number | null;
  DaysOnMarket?: number | null;
  type?: string | null;
}

/** New listing alert matching a saved search. */
export function listingAlertHtml(opts: {
  searchLabel: string;
  listings: ListingCardInput[];
}): string {
  const rows = clampRows(opts.listings);
  const cards = rows
    .map(
      (l) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">
          <strong>${esc(l.L_Address)}, ${esc(l.L_City)} ${esc(l.L_Zip)}</strong><br/>
          ${esc(money(l.price))} · ${esc(l.beds)} bd / ${esc(l.baths)} ba · ${esc(l.sqft)} sqft<br/>
          Photos: ${esc(l.PhotoCount)} · DOM: ${esc(l.DaysOnMarket)}
        </td>
      </tr>`,
    )
    .join("");

  return wrapEmail(
    `New listings for: ${esc(opts.searchLabel)}`,
    `<p>${rows.length} active listing(s) matched your saved search (max 50 shown).</p>
     <table width="100%" cellpadding="0" cellspacing="0">${cards || "<tr><td>No matches.</td></tr>"}</table>`,
  );
}

/** Weekly market report from california_sold analytics. */
export function weeklyMarketReportHtml(opts: {
  city: string;
  months: number;
  soldCount: number | null;
  medianClose: number | null;
  avgClose: number | null;
  avgPpsf: number | null;
  avgDom: number | null;
  listToClosePct: number | null;
  activeListings: number | null;
  monthsOfInventory: number | null;
  trendLines?: string[];
}): string {
  const trends = (opts.trendLines ?? [])
    .slice(0, 6)
    .map((t) => `<li>${esc(t)}</li>`)
    .join("");

  return wrapEmail(
    `Weekly market report — ${esc(opts.city)}`,
    `
    <p>Compiled from <code>california_sold</code> (last ${esc(opts.months)} months, residential).</p>
    <ul>
      <li>Sold comps: <strong>${esc(opts.soldCount)}</strong></li>
      <li>Median close: <strong>${esc(money(opts.medianClose))}</strong></li>
      <li>Average close: <strong>${esc(money(opts.avgClose))}</strong></li>
      <li>Avg $/sqft: <strong>${esc(money(opts.avgPpsf))}</strong></li>
      <li>Avg DOM: <strong>${esc(opts.avgDom)}</strong></li>
      <li>List-to-close: <strong>${esc(opts.listToClosePct)}${opts.listToClosePct != null ? "%" : ""}</strong></li>
      <li>Active inventory: <strong>${esc(opts.activeListings)}</strong></li>
      <li>Months of inventory: <strong>${esc(opts.monthsOfInventory)}</strong></li>
    </ul>
    ${trends ? `<p><strong>Recent monthly trend</strong></p><ul>${trends}</ul>` : ""}
    <p style="color:#666;font-size:12px;">Not financial advice. Data for informational use only.</p>
    `,
  );
}

/** Property summary card with address, photos, price, optional comps blurb. */
export function propertySummaryHtml(opts: {
  listing: ListingCardInput;
  compsNote?: string;
}): string {
  const l = opts.listing;
  return wrapEmail(
    `Property summary — ${esc(l.L_Address)}, ${esc(l.L_City)}`,
    `
    <h2 style="margin:0 0 8px;">${esc(l.L_Address)}, ${esc(l.L_City)} ${esc(l.L_Zip)}</h2>
    <p><strong>${esc(money(l.price))}</strong> · ${esc(l.beds)} bd / ${esc(l.baths)} ba · ${esc(l.sqft)} sqft</p>
    <p>Type: ${esc(l.type)} · Photos: ${esc(l.PhotoCount)} · DOM: ${esc(l.DaysOnMarket)}</p>
    ${opts.compsNote ? `<p><em>Comps:</em> ${esc(opts.compsNote)}</p>` : ""}
    `,
  );
}

/** Personalized recommendation digest. */
export function recommendationDigestHtml(opts: {
  intro: string;
  listings: ListingCardInput[];
}): string {
  const rows = clampRows(opts.listings);
  const items = rows
    .map(
      (l, i) =>
        `<li><strong>${i + 1}. ${esc(l.L_Address)}, ${esc(l.L_City)}</strong> — ${esc(money(l.price))} · ${esc(l.beds)}/${esc(l.baths)} · ${esc(l.sqft)} sqft</li>`,
    )
    .join("");

  return wrapEmail(
    "Homes you may like",
    `<p>${esc(opts.intro)}</p><ol>${items || "<li>No recommendations yet.</li>"}</ol>`,
  );
}

function wrapEmail(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#222;max-width:640px;margin:0 auto;padding:16px;">
  <h1 style="font-size:20px;">${title}</h1>
  ${inner}
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;" />
  <p style="font-size:11px;color:#888;">IDX Exchange · Draft email · Requires human approval before send</p>
</body></html>`;
}
