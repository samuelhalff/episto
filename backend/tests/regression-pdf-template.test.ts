/**
 * Regression: PDF letter template must render all required Swiss letter elements.
 *
 * User stories:
 * - "As a user, my letter PDF contains sender info, recipient address, date,
 *    subject line, salutation, body, closing, and signature."
 * - "As a user, the enclosure note appears when provided."
 * - "As a user, a letter without a signature mode omits the signature block."
 * - "As a user, the first-page layout matches the reviewed right-window postal template."
 * - "As a user, the recipient block shows company, department, name, and full address."
 * - "As a user, the date includes the sender's city when available."
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SnapshotData } from "@episto/shared";
import { assertDefined } from "./assert-defined";

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

  it("renders a sender block in the top-left without the old sender one-liner", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("letter-layout-shell");
    expect(html).toContain("sender-block");
    expect(html).not.toContain("sender-line");
    expect(html).toContain("width: 80mm");
    expect(html).toContain("Mueller GmbH");
    expect(html).toContain("Anna Mueller");
    expect(html).toContain("Bahnhofstrasse 10");
    expect(html).toContain("8001 Zurich");
  });

  it("includes sender.addressLine2 in the sender block when present", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(
      makeSnapshotData({
        sender: {
          firstName: "Anna",
          lastName: "Mueller",
          company: "Mueller GmbH",
          addressLine1: "Bahnhofstrasse 10",
          addressLine2: "Postfach 42",
          postalCode: "8001",
          city: "Zurich",
          country: "CH",
        },
      }),
    );

    expect(html).toContain("Postfach 42");
    const senderBlockMatch = html.match(/<div class="sender-block">[\s\S]*?<\/div>/);
    expect(senderBlockMatch).not.toBeNull();
    expect(assertDefined(senderBlockMatch)[0]).toContain("Postfach 42");
  });

  it("omits sender.addressLine2 from the sender block when null", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
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

    const senderBlockMatch = html.match(/<div class="sender-block">[\s\S]*?<\/div>/);
    expect(senderBlockMatch).not.toBeNull();
    expect(assertDefined(senderBlockMatch)[0]).not.toContain("null");
  });

  it("includes recipient.addressLine2 in the recipient block when present", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    // Default fixture has addressLine2: "Postfach 100"
    expect(html).toContain("Postfach 100");
    const recipientBlockMatch = html.match(
      /<div class="recipient-block">[\s\S]*?<\/div>/,
    );
    expect(recipientBlockMatch).not.toBeNull();
    expect(assertDefined(recipientBlockMatch)[0]).toContain("Postfach 100");
  });

  it("renders the full recipient block with company, department, name, and address", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("recipient-block");
    expect(html).toContain("Weber AG");
    expect(html).toContain("Legal Department");
    expect(html).toContain("Max Weber");
    expect(html).toContain("Marktgasse 5");
    expect(html).toContain("Postfach 100");
    expect(html).toContain("3011 Bern");
  });

  it("renders the logistics line above the right-side recipient block", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("dispatch-line");
    expect(html).toContain("STANDARD MAIL");
    expect(html).toContain("text-decoration: underline");
    expect(html).toContain("left: 121mm");
  });

  it("renders the date line below the recipient block with sender city", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("right-meta");
    expect(html).toContain("date-line");
    expect(html).toContain("top: 87mm");
    expect(html).toContain("Zurich,");
  });

  it("renders the subject line", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("subject-line");
    expect(html).toContain("Account closure request");
  });

  it("renders salutation and closing when body has content", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("salutation-line");
    expect(html).toContain("closing-line");
  });

  it("renders a typed signature block with cursive and plain name", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData({ signatureMode: "typed" }));

    expect(html).toContain("signature-block");
    expect(html).toContain("signature-script");
    expect(html).toContain("signature-name");
    expect(html).toContain("Anna Mueller");
  });

  it("omits signature block element when signatureMode is null", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData({ signatureMode: null }));

    // CSS class definitions stay in the <style> block, but no element is rendered
    expect(html).not.toContain('<div class="signature-block">');
    expect(html).not.toContain('<div class="signature-script">');
  });

  it("does not fabricate a typed signature block when drawn mode has no image payload", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(
      makeSnapshotData({
        signatureMode: "drawn",
        signatureAssetId: "22222222-2222-4222-8222-222222222222",
      }),
    );

    expect(html).not.toContain('<div class="signature-block">');
    expect(html).not.toContain('<div class="signature-script">');
  });

  it("renders drawn signatures through the blue svg source instead of a raw png data url", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(
      makeSnapshotData({
        signatureMode: "drawn",
        signatureAssetId: "22222222-2222-4222-8222-222222222222",
      }),
      {
        signatureImage: {
          mimeType: "image/jpeg",
          base64: "ZmFrZWpwZWc=",
        },
      },
    );

    expect(html).toContain("image/svg+xml");
    expect(html).toContain("%231d4ed8");
    expect(html).toContain("data%3Aimage%2Fjpeg%3Bbase64%2CZmFrZWpwZWc%3D");
    expect(html).not.toContain("data:image/png;base64");
    expect(html).not.toContain("data-signature-ink=");
    expect(html).not.toContain("data-signature-source=");
  });

  it("renders the enclosure note when provided", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(
      makeSnapshotData({ enclosureNote: "Enclosure: Copy of ID" }),
    );

    expect(html).toContain("enclosure-note");
    expect(html).toContain("Enclosure: Copy of ID");
  });

  it("omits enclosure note element when null (CSS class still in stylesheet)", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData({ enclosureNote: null }));

    // The CSS class definition stays in the <style> block, but no element is rendered
    expect(html).not.toContain('<div class="enclosure-note">');
  });

  it("uses A4 page size in CSS", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const html = renderLetterHtml(makeSnapshotData());

    expect(html).toContain("size: A4");
  });

  it("sets the lang attribute to the snapshot locale", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
    const htmlEn = renderLetterHtml(makeSnapshotData({ locale: "en-CH" }));
    expect(htmlEn).toContain('lang="en-CH"');

    const htmlDe = renderLetterHtml(makeSnapshotData({ locale: "de-CH" }));
    expect(htmlDe).toContain('lang="de-CH"');
  });

  it("escapes HTML in user-provided fields to prevent injection", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
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
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
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
    expect(html).toContain("sender-block");
  });

  it("renders without crashing when recipient has no company or department", async () => {
    const { renderLetterHtml } =
      await import("../src/modules/rendering/render-template.js");
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
