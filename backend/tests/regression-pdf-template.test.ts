/**
 * Regression: PDF letter template must render all required Swiss letter elements.
 *
 * User stories:
 * - "As a user, my letter PDF contains sender info, recipient address, date,
 *    subject line, salutation, body, closing, and signature."
 * - "As a user, the enclosure note appears when provided."
 * - "As a user, a letter without a signature mode omits the signature block."
 * - "As a user, the sender one-liner uses · separators (Swiss SN standard)."
 * - "As a user, the recipient block shows company, department, name, and full address."
 * - "As a user, the date includes the sender's city when available."
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SnapshotData } from "@swiss-mail/shared";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-font-data")),
}));

function makeSnapshotData(overrides?: Partial<SnapshotData>): SnapshotData {
  return {
    schemaVersion: 1,
    locale: "en-CH",
    deliveryType: "standard",
    subject: "Account closure request",
    body: "Please close my account by end of month.",
    enclosureNote: null,
    signatureMode: "typed",
    tone: null,
    intent: null,
    sender: {
      firstName: "Anna",
      lastName: "Mueller",
      company: "Mueller GmbH",
      addressLine1: "Bahnhofstrasse 10",
      addressLine2: null,
      postalCode: "8001",
      city: "Zurich",
      country: "CH",
    },
    recipient: {
      firstName: "Max",
      lastName: "Weber",
      company: "Weber AG",
      department: "Legal Department",
      addressLine1: "Marktgasse 5",
      addressLine2: "Postfach 100",
      postalCode: "3011",
      city: "Bern",
      country: "CH",
    },
    attachmentAssetIds: [],
    signatureAssetId: null,
    estimatedPages: 1,
    metadata: null,
    ...overrides,
  };
}

describe("regression: PDF letter template renders all elements", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders the sender one-liner with · separators", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("sender-line");
    // · separator between sender fields
    expect(html).toContain("\u00B7");
    expect(html).toContain("Mueller GmbH");
    expect(html).toContain("Anna Mueller");
    expect(html).toContain("Bahnhofstrasse 10");
    expect(html).toContain("8001 Zurich");
  });

  it("renders the full recipient block with company, department, name, and address", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("recipient-block");
    expect(html).toContain("Weber AG");
    expect(html).toContain("Legal Department");
    expect(html).toContain("Max Weber");
    expect(html).toContain("Marktgasse 5");
    expect(html).toContain("Postfach 100");
    expect(html).toContain("3011 Bern");
  });

  it("renders the date line with sender city", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("date-line");
    expect(html).toContain("text-align: right");
    expect(html).toContain("Zurich,");
  });

  it("renders the subject line", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("subject-line");
    expect(html).toContain("Account closure request");
  });

  it("renders salutation and closing when body has content", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("salutation-line");
    expect(html).toContain("closing-line");
  });

  it("renders a typed signature block with cursive and plain name", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData({ signatureMode: "typed" }));

    expect(html).toContain("signature-block");
    expect(html).toContain("signature-script");
    expect(html).toContain("signature-name");
    expect(html).toContain("Anna Mueller");
  });

  it("omits signature block element when signatureMode is null", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData({ signatureMode: null }));

    // CSS class definitions stay in the <style> block, but no element is rendered
    expect(html).not.toContain('<div class="signature-block">');
    expect(html).not.toContain('<div class="signature-script">');
  });

  it("renders the enclosure note when provided", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(
      makeSnapshotData({ enclosureNote: "Enclosure: Copy of ID" }),
    );

    expect(html).toContain("enclosure-note");
    expect(html).toContain("Enclosure: Copy of ID");
  });

  it("omits enclosure note element when null (CSS class still in stylesheet)", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData({ enclosureNote: null }));

    // The CSS class definition stays in the <style> block, but no element is rendered
    expect(html).not.toContain('<div class="enclosure-note">');
  });

  it("uses A4 page size in CSS", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("size: A4");
  });

  it("sets the lang attribute to the snapshot locale", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const htmlEn = renderLetterHtml(makeSnapshotData({ locale: "en-CH" }));
    expect(htmlEn).toContain('lang="en-CH"');

    const htmlDe = renderLetterHtml(makeSnapshotData({ locale: "de-CH" }));
    expect(htmlDe).toContain('lang="de-CH"');
  });

  it("escapes HTML in user-provided fields to prevent injection", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(
      makeSnapshotData({
        subject: '<script>alert("xss")</script>',
        sender: {
          firstName: '<img onerror="hack()">',
          lastName: "Safe",
          company: null,
          addressLine1: "Street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
      }),
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain('onerror="hack()"');
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders without crashing when sender has no company", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(
      makeSnapshotData({
        sender: {
          firstName: "Solo",
          lastName: "Person",
          company: null,
          addressLine1: "Street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
      }),
    );

    expect(html).toContain("Solo Person");
    expect(html).toContain("sender-line");
  });

  it("renders without crashing when recipient has no company or department", async () => {
    const { renderLetterHtml } = await import(
      "../src/modules/rendering/render.service.js"
    );
    const html = renderLetterHtml(
      makeSnapshotData({
        recipient: {
          firstName: "Jane",
          lastName: "Doe",
          company: null,
          department: null,
          addressLine1: "Some St 1",
          addressLine2: null,
          postalCode: "3000",
          city: "Bern",
          country: "CH",
        },
      }),
    );

    expect(html).toContain("Jane Doe");
    expect(html).toContain("recipient-block");
  });
});
