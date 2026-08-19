import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import enCH from "../src/messages/en-CH.json";
import deCH from "../src/messages/de-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const downloadFileSource = readFileSync(
  path.join(repoRoot, "frontend/src/lib/download-file.ts"),
  "utf8",
);

const buttonSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/ProtectedPdfDownloadButton.tsx"),
  "utf8",
);

const confirmationPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx"),
  "utf8",
);

// ---------------------------------------------------------------------------
// download-file.ts contract
// ---------------------------------------------------------------------------

describe("download-file.ts", () => {
  it("imports getApiUrl", () => {
    expect(downloadFileSource).toMatch(/getApiUrl/);
  });

  it("includes credentials: include", () => {
    expect(downloadFileSource).toMatch(/credentials.*include/);
  });

  it("sets X-Requested-With header", () => {
    expect(downloadFileSource).toMatch(/X-Requested-With/);
  });

  it("throws ApiError on non-OK responses", () => {
    expect(downloadFileSource).toMatch(/ApiError/);
  });

  it("uses URL.createObjectURL", () => {
    expect(downloadFileSource).toMatch(/URL\.createObjectURL/);
  });

  it("provides a fallback file name", () => {
    expect(downloadFileSource).toMatch(/letter\.pdf/);
  });
});

// ---------------------------------------------------------------------------
// ProtectedPdfDownloadButton.tsx contract
// ---------------------------------------------------------------------------

describe("ProtectedPdfDownloadButton.tsx", () => {
  it("is a client component", () => {
    expect(buttonSource).toMatch(/"use client"/);
  });

  it("uses ActionButton", () => {
    expect(buttonSource).toMatch(/ActionButton/);
  });

  it("uses Download icon", () => {
    expect(buttonSource).toMatch(/Download/);
  });

  it("uses downloadFile", () => {
    expect(buttonSource).toMatch(/downloadFile/);
  });

  it("uses getApiErrorUserMessage", () => {
    expect(buttonSource).toMatch(/getApiErrorUserMessage/);
  });

  it("passes fullWidth to ActionButton so the button fills its wrapper", () => {
    expect(buttonSource).toMatch(/fullWidth/);
  });

  it("namespace prop comment describes i18n purpose not test tooling", () => {
    expect(buttonSource).not.toMatch(/Vitest-friendly/);
  });

  it("shows inline unavailable error message", () => {
    expect(buttonSource).toMatch(/downloadUnavailable/);
  });

  it("marks the error paragraph with role=alert for live-region announcement", () => {
    expect(buttonSource).toMatch(/role="alert"/);
  });
});

// ---------------------------------------------------------------------------
// Confirmation page uses ProtectedPdfDownloadButton
// ---------------------------------------------------------------------------

describe("confirmation page", () => {
  it("imports ProtectedPdfDownloadButton", () => {
    expect(confirmationPageSource).toMatch(/ProtectedPdfDownloadButton/);
  });

  it("uses /v1/drafts/:draftId/pdf endpoint", () => {
    expect(confirmationPageSource).toMatch(/\/v1\/drafts\/\$\{draftId\}\/pdf/);
  });

  it("no longer uses a raw <a> tag for PDF download", () => {
    // The old implementation used href={pdfUrl} with target="_blank"
    // It should now use ProtectedPdfDownloadButton instead
    expect(confirmationPageSource).not.toMatch(/href=\{pdfUrl\}.*target.*_blank/);
  });
});

// ---------------------------------------------------------------------------
// i18n: all four locales define downloadLetter and downloadUnavailable
// ---------------------------------------------------------------------------

const REQUIRED_KEYS = ["downloadLetter", "downloadUnavailable"] as const;

const LOCALES = [
  { name: "en-CH", messages: enCH },
  { name: "de-CH", messages: deCH },
  { name: "fr-CH", messages: frCH },
  { name: "it-CH", messages: itCH },
] as const;

for (const { name, messages } of LOCALES) {
  describe(`${name} locale messages`, () => {
    for (const key of REQUIRED_KEYS) {
      it(`defines confirmation.${key}`, () => {
        const confirmation = (messages as Record<string, Record<string, string>>)[
          "confirmation"
        ];
        expect(confirmation).toBeDefined();
        expect(confirmation[key]).toBeTruthy();
      });
    }
  });
}

// ---------------------------------------------------------------------------
// en-CH exact copy values (locked against approved plan)
// ---------------------------------------------------------------------------

describe("en-CH exact copy values", () => {
  const confirmation = (enCH as Record<string, Record<string, string>>)["confirmation"];

  it("confirmation.downloadLetter matches approved copy", () => {
    expect(confirmation["downloadLetter"]).toBe("Download confirmation");
  });

  it("confirmation.downloadUnavailable matches approved copy", () => {
    expect(confirmation["downloadUnavailable"]).toBe(
      "The confirmation document is no longer available.",
    );
  });
});
