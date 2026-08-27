import { orchestrate, type OrchestrateResult } from "./orchestrate.js";

/** Optional listing shape from the Week 10 handbook (agents already format into `reply`). */
export interface WhatsAppListingCard {
  L_Address?: string | null;
  L_City?: string | null;
  price?: number | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  DaysOnMarket?: number | null;
}

export type WhatsAppFormatInput = OrchestrateResult & {
  listings?: WhatsAppListingCard[];
  response?: string;
};

/**
 * OpenClaw / Baileys already shows typing while the agent runs the script.
 * Kept as an explicit hook so the Week 10 message-handler shape matches the handbook.
 */
export async function sendTypingIndicator(userId: string): Promise<void> {
  void userId;
}

/** Format orchestrator output for WhatsApp (plain text; optional structured listing cards). */
export function formatForWhatsApp(result: WhatsAppFormatInput): string {
  if (result.listings && result.listings.length > 0) {
    return result.listings
      .slice(0, 5)
      .map((l) => {
        const address = [l.L_Address, l.L_City].filter(Boolean).join(", ") || "Address unavailable";
        const price =
          l.price != null
            ? `$${Number(l.price).toLocaleString("en-US")}`
            : "Price N/A";
        const beds = l.beds != null ? String(l.beds) : "?";
        const baths = l.baths != null ? String(l.baths) : "?";
        const sqft = l.sqft != null ? `${Number(l.sqft).toLocaleString("en-US")} sqft` : "sqft N/A";
        const dom =
          l.DaysOnMarket != null ? `${l.DaysOnMarket} days on market` : "DOM N/A";
        return (
          `*${address}*\n` +
          `  ${price} | ${beds}bd/${baths}ba | ${sqft}\n` +
          `  ${dom}`
        );
      })
      .join("\n\n");
  }

  const text = (result.reply || result.response || "").trim();
  return text || "No results found.";
}

/**
 * WhatsApp message handler (Week 10).
 * Live path: WhatsApp → OpenClaw channel → this handler (via `npm run orchestrate`) → agents → DB → reply.
 */
export async function onWhatsAppMessage(message: string, userId: string): Promise<string> {
  await sendTypingIndicator(userId);
  try {
    const result = await orchestrate(message, userId);
    return formatForWhatsApp(result);
  } catch (err) {
    console.error("Orchestration error:", err);
    return "Sorry, I hit an issue. Please try again.";
  }
}
