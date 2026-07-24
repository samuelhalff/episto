import { describe, expect, it } from "vitest";

describe("confirmation document template", () => {
  it("renders a minimal dispatch statement that matches the app palette, keeps tracking visible, and hides mock provider references", async () => {
    const { renderConfirmationDocumentHtml } =
      await import("../src/modules/rendering/confirmation-document.js");

    const html = renderConfirmationDocumentHtml({
      orderRef: "EP-4FD8704A",
      locale: "en-CH",
      submittedAt: new Date("2026-04-08T12:00:00.000Z"),
      dispatchState: "accepted",
      deliveryType: "registered",
      providerMode: "mock",
      providerReference: "EPR-T-R-0D2D6C40F706",
      trackingNumber: "98.40.541881.00002354",
      pageCount: 2,
      attachmentNames: ["contract-scan.pdf"],
      sender: {
        firstName: "Anna",
        lastName: "Meier",
        company: null,
        addressLine1: "Seestrasse 15",
        addressLine2: null,
        postalCode: "8002",
        city: "Zurich",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "Muller Immobilien AG",
        department: null,
        addressLine1: "Bahnhofstrasse 42",
        addressLine2: null,
        postalCode: "8001",
        city: "Zurich",
        country: "CH",
      },
      subject: "Termination of lease",
      contentSummary:
        "This document confirms that the attached letter was submitted for dispatch.",
      letterHtml: '<section class="letter-pages">Letter body</section>',
      letterPageCount: 2,
      totalContentPages: 5,
      letterSha256: "a".repeat(64),
      enclosures: [{ name: "contract-scan.pdf", pageCount: 3 }],
      enclosureHashes: [{ name: "contract-scan.pdf", sha256: "b".repeat(64) }],
      issuer: {
        name: "West Bay SA",
        addressLine1: "Chemin du Pre-Roset 19",
        addressLine2: "1294 Genthod",
        country: "Switzerland",
        uidVat: "CHE-107.892.984",
        supportEmail: "contact@episto.ch",
      },
    });

    expect(html).toContain("episto");
    expect(html).toContain("Dispatch statement");
    // Court-grade justificatif sections.
    expect(html).toContain("Attestation");
    expect(html).toContain("deposited with Swiss Post");
    // Zone B content breakdown ("Letter 2 pages + enclosures 3 pages = 5 pages").
    expect(html).toContain("Letter 2 pages + enclosures 3 pages = 5 pages");
    expect(html).toContain("Letter fingerprint");
    // Hash is grouped into 8-char clusters at render time (stored hash untouched).
    expect(html).toContain(`${"a".repeat(8)} ${"a".repeat(8)}`);
    expect(html).not.toContain("a".repeat(64));
    // Short verify explainer replaces the long fingerprint note on the cover.
    expect(html).toContain("Recompute the SHA-256");
    // Plain enclosure list (no pill chips): filename + page count.
    expect(html).toContain("contract-scan.pdf");
    expect(html).toContain("(3 pages)");
    expect(html).toContain(`${"b".repeat(8)} ${"b".repeat(8)}`);
    // Issuer signature line naming the deposit-data source.
    expect(html).toContain("West Bay SA");
    expect(html).toContain("CHE-107.892.984");
    expect(html).toContain("Swiss Post Ltd");
    expect(html).toContain("contact@episto.ch");
    // Timezone-stamped timestamps.
    expect(html).toContain("Swiss time");
    expect(html).toContain("Statement issued on");
    expect(html).toContain("Deposited on");
    // Order ref appears in the References fact column (mono).
    expect(html).toContain("EP-4FD8704A");
    // The tracking number is the mono hero identifier (no "Tracking number" label).
    expect(html).toContain("98.40.541881.00002354");
    // Ledger palette: amber accent only, ink text, print-clean white background.
    expect(html).toContain("#f6c54a");
    expect(html).toContain("#ffffff");
    expect(html).toContain("#161616");
    // The amber is reserved for the status dot, never a pill/green background.
    expect(html).toContain("status-dot");
    // No cards: no shadows, no card classes, no tinted section backgrounds.
    expect(html).not.toContain("box-shadow");
    expect(html).not.toContain("header-card");
    expect(html).not.toContain("section-card");
    expect(html).not.toContain("reference-card");
    expect(html).not.toContain("#fffaf2");
    // The anchor rule (1.5pt ink) is the document's spine.
    expect(html).toContain("anchor-rule");
    // Mono hero identifier for the tracking number.
    expect(html).toContain("hero-tracking");
    expect(html).toContain('<circle cx="26" cy="30" r="10.5"');
    expect(html).toContain('<circle cx="36.5" cy="19.5" r="4.5"');
    expect(html).not.toContain("M18 28h16");
    expect(html).toContain("min-height: 297mm");
    expect(html).not.toMatch(/\.confirmation-page\s*\{\s*height:\s*297mm/);
    expect(html).not.toContain("overflow: hidden");
    expect(html).not.toContain("Content summary");
    expect(html).not.toContain("Submission mode");
    expect(html).not.toContain("Preview record");
    expect(html).not.toContain("Live handoff");
    expect(html).not.toContain("EPR-T-R-0D2D6C40F706");
    expect(html).not.toContain("#c62828");
    expect(html).not.toContain("radial-gradient");
    expect(html).toContain("letter-pages");
  });

  it("localizes the dispatch statement and shows live tracking with black emphasis", async () => {
    const { renderConfirmationDocumentHtml } =
      await import("../src/modules/rendering/confirmation-document.js");

    const html = renderConfirmationDocumentHtml({
      orderRef: "EP-7GC1209B",
      locale: "fr-CH",
      submittedAt: new Date("2026-04-08T12:00:00.000Z"),
      dispatchState: "accepted",
      deliveryType: "registered",
      providerMode: "live",
      providerReference: "EPR-R-7GC1209B",
      trackingNumber: "98.40.541881.00002354",
      pageCount: 2,
      attachmentNames: [],
      sender: {
        firstName: "Anna",
        lastName: "Meier",
        company: null,
        addressLine1: "Seestrasse 15",
        addressLine2: null,
        postalCode: "8002",
        city: "Zurich",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "Muller Immobilier SA",
        department: null,
        addressLine1: "Bahnhofstrasse 42",
        addressLine2: null,
        postalCode: "8001",
        city: "Zurich",
        country: "CH",
      },
      subject: "Resiliation du bail",
      contentSummary:
        "Cette lettre confirme la preparation du courrier pour l'acheminement.",
      letterHtml: '<section class="letter-pages">Letter body</section>',
    });

    expect(html).toContain("Justificatif d'envoi");
    expect(html).toContain("Justificatif établi le");
    expect(html).toContain("Courrier recommandé");
    expect(html).toContain("98.40.541881.00002354");
    // Tracking is the mono hero identifier under the ENVOI eyebrow.
    expect(html).toContain("hero-tracking");
    expect(html).toContain("Envoi");
    expect(html).not.toContain("Preview");
    // Localized attestation (accented, "en envoi recommandé") + graceful default.
    expect(html).toContain("déposées à la Poste suisse");
    expect(html).toContain("en envoi recommandé");
    expect(html).toContain("Aucune pièce jointe.");
    expect(html).not.toContain("Empreinte de la lettre");
    // Timezone in Swiss French.
    expect(html).toContain("heure suisse");
    expect(html).toContain("Déposé le");
  });

  it("groups a hex fingerprint into 8-char clusters without altering the digits", async () => {
    const { groupHash } =
      await import("../src/modules/rendering/confirmation-document.js");

    const hash = "3a7bd3e2360a3d29eec6d84e";
    const grouped = groupHash(hash);

    expect(grouped).toBe("3a7bd3e2 360a3d29 eec6d84e");
    // Removing the spaces recovers the original digest exactly.
    expect(grouped.replace(/ /g, "")).toBe(hash);
    // A full 64-char digest yields eight clusters (seven separators).
    expect(groupHash("a".repeat(64)).split(" ")).toHaveLength(8);
  });
});
