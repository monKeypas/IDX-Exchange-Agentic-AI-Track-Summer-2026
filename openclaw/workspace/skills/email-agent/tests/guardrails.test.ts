import { describe, expect, it, vi } from "vitest";
import { draftEmail, formatDraftPreview, markApproved } from "../src/draftEmail.js";
import {
  assertSendAllowed,
  clampRows,
  exceedsRowLimit,
  MAX_ROWS_PER_QUERY,
  redactSecrets,
} from "../src/guardrails.js";
import {
  listingAlertHtml,
  weeklyMarketReportHtml,
  propertySummaryHtml,
  recommendationDigestHtml,
} from "../src/templates.js";
import { sendApprovedEmail } from "../src/sendEmail.js";

describe("guardrails", () => {
  it("clamps result sets to ≤50 rows", () => {
    const rows = Array.from({ length: 80 }, (_, i) => i);
    expect(clampRows(rows)).toHaveLength(MAX_ROWS_PER_QUERY);
    expect(clampRows(rows, 10)).toHaveLength(10);
    expect(exceedsRowLimit(50)).toBe(false);
    expect(exceedsRowLimit(51)).toBe(true);
  });

  it("redacts credentials from log text", () => {
    process.env.EMAIL_PASSWORD = "super-secret-pass";
    process.env.EMAIL_USER = "agent@example.com";
    const raw = `login with ${process.env.EMAIL_USER} / ${process.env.EMAIL_PASSWORD}`;
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("super-secret-pass");
    expect(redacted).toContain("[REDACTED:EMAIL_PASSWORD]");
    expect(redacted).toContain("[REDACTED:EMAIL_USER]");
    delete process.env.EMAIL_PASSWORD;
    delete process.env.EMAIL_USER;
  });

  it("blocks send without explicit approval", () => {
    expect(() =>
      assertSendAllowed({ status: "pending_approval", explicitApprove: false }),
    ).toThrow(/--approve/);
  });
});

describe("draftEmail", () => {
  it("returns pending_approval and never marks sent", async () => {
    const result = await draftEmail(
      "buyer@example.com",
      "Test subject",
      "<p>Hello</p>",
      "market_report",
    );
    expect(result.status).toBe("pending_approval");
    expect(result.draft.status).toBe("pending_approval");
    expect(result.draft.to).toBe("buyer@example.com");
    expect(result.preview).toContain("Draft only — not sent");
    expect(result.preview).toContain(result.draft.id);
  });

  it("markApproved flips status without sending", () => {
    const draft = markApproved({
      id: "abc",
      to: "a@b.com",
      subject: "s",
      body: "b",
      useCase: "listing_alert",
      status: "pending_approval",
      createdAt: new Date().toISOString(),
    });
    expect(draft.status).toBe("approved");
    expect(draft.approvedAt).toBeTruthy();
  });
});

describe("sendApprovedEmail safety", () => {
  it("refuses to send when --approve is missing", async () => {
    const { draft } = await draftEmail("a@b.com", "s", "<p>x</p>");
    await expect(
      sendApprovedEmail(draft, { explicitApprove: false }),
    ).rejects.toThrow(/--approve/);
  });

  it("does not call nodemailer when approval is missing", async () => {
    const sendMail = vi.fn();
    vi.doMock("nodemailer", () => ({
      default: {
        createTransport: () => ({ sendMail }),
      },
    }));
    const { draft } = await draftEmail("a@b.com", "s", "<p>x</p>");
    await expect(
      sendApprovedEmail(draft, { explicitApprove: false }),
    ).rejects.toThrow();
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("templates", () => {
  it("builds weekly market report HTML from california_sold-style stats", () => {
    const html = weeklyMarketReportHtml({
      city: "Pasadena",
      months: 12,
      soldCount: 498,
      medianClose: 1_275_000,
      avgClose: 1_500_000,
      avgPpsf: 800,
      avgDom: 40,
      listToClosePct: 103,
      activeListings: 277,
      monthsOfInventory: 6.7,
      trendLines: ["2026-06: avg $1,800,000 · 50 sales (+10%)"],
    });
    expect(html).toContain("Pasadena");
    expect(html).toContain("california_sold");
    expect(html).toContain("498");
    expect(html).toContain("Requires human approval");
  });

  it("clamps listing alert cards to 50", () => {
    const listings = Array.from({ length: 60 }, (_, i) => ({
      L_Address: `${i} Main`,
      L_City: "Irvine",
      price: 500_000 + i,
      beds: 2,
      baths: 2,
      sqft: 1000,
      PhotoCount: 10,
      DaysOnMarket: 5,
    }));
    const html = listingAlertHtml({ searchLabel: "Irvine under 1m", listings });
    expect(html).toContain("50 active listing(s)");
    expect(html).not.toContain("60 Main");
  });

  it("builds property summary and recommendation digest", () => {
    expect(
      propertySummaryHtml({
        listing: {
          L_Address: "1 Oak",
          L_City: "Irvine",
          price: 900_000,
          beds: 3,
          baths: 2,
          sqft: 1400,
          PhotoCount: 20,
        },
      }),
    ).toContain("1 Oak");

    expect(
      recommendationDigestHtml({
        intro: "Based on your liked home",
        listings: [{ L_Address: "2 Pine", L_City: "Irvine", price: 850_000, beds: 3, baths: 2 }],
      }),
    ).toContain("2 Pine");
  });
});

describe("formatDraftPreview", () => {
  it("shows queue instructions", async () => {
    const { draft } = await draftEmail("x@y.com", "Hi", "<b>Body</b>");
    const preview = formatDraftPreview(draft);
    expect(preview).toContain("email:send");
    expect(preview).toContain("--approve");
  });
});
