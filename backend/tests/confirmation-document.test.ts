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

    expect(html).toContain("Episto");
    expect(html).toContain("Dispatch statement");
    // Court-grade justificatif sections.
    expect(html).toContain("Attestation");
    expect(html).toContain("deposited with Swiss Post");
    expect(html).toContain("Content overview");
    expect(html).toContain("Letter fingerprint");
    // Hash is grouped into 8-char clusters at render time (stored hash untouched).
    expect(html).toContain(`${"a".repeat(8)} ${"a".repeat(8)}`);
    expect(html).not.toContain("a".repeat(64));
    expect(html).toContain("recompute the SHA-256 fingerprint");
    expect(html).toContain("contract-scan.pdf (3 pages)");
    expect(html).toContain(`${"b".repeat(8)} ${"b".repeat(8)}`);
    // Issuer block naming the deposit-data source.
    expect(html).toContain("West Bay SA");
    expect(html).toContain("CHE-107.892.984");
    expect(html).toContain("Swiss Post Ltd");
    expect(html).toContain("contact@episto.ch");
    // Timezone-stamped timestamps.
    expect(html).toContain("Swiss time");
    expect(html).toContain("Statement issued on");
    expect(html).toContain("Deposited on");
    expect(html).toContain("EP-4FD8704A");
    expect(html).toContain("98.40.541881.00002354");
    expect(html).toContain("Tracking number");
    expect(html).toContain("#f6c54a");
    expect(html).toContain("#fffaf2");
    expect(html).toContain("#18181b");
    expect(html).toContain("font-weight: 900");
    expect(html).toContain('<circle cx="26" cy="30" r="10.5"');
    expect(html).toContain('<circle cx="36.5" cy="19.5" r="4.5"');
    expect(html).not.toContain("M18 28h16");
    expect(html).toContain("min-height: 297mm");
    expect(html).toContain("break-inside: avoid");
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
    expect(html).toContain("tracking-value");
    expect(html).toContain("font-weight: 900");
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
