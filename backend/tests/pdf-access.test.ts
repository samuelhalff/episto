import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const frontPdf = {
    id: "front",
    getPageIndices: vi.fn(() => [0]),
    getPageCount: vi.fn(() => 1),
  };
  const letterPdf = {
    id: "letter",
    getPageIndices: vi.fn(() => [0, 1]),
    getPageCount: vi.fn(() => 2),
  };
  const bundlePdf = {
    copyPages: vi.fn(async (source: { id: string }, indexes: number[]) =>
      indexes.map((index) => ({ sourceId: source.id, index })),
    ),
    addPage: vi.fn(),
    save: vi.fn(async () => Buffer.from("merged-pdf")),
  };

  return {
    frontPdf,
    letterPdf,
    bundlePdf,
    loadPdf: vi.fn(),
    createPdf: vi.fn(),
    getLatestSnapshot: vi.fn(),
    downloadObjectBuffer: vi.fn(),
    renderConfirmationDocumentHtml: vi.fn(),
    renderLetterHtml: vi.fn(),
    renderPdfBufferFromHtml: vi.fn(),
  };
});

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    load: mocks.loadPdf,
    create: mocks.createPdf,
  },
}));

vi.mock("../src/modules/rendering/snapshot.service.js", () => ({
  getLatestSnapshot: mocks.getLatestSnapshot,
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  downloadObjectBuffer: mocks.downloadObjectBuffer,
}));

vi.mock("../src/modules/rendering/confirmation-document.js", () => ({
  renderConfirmationDocumentHtml: mocks.renderConfirmationDocumentHtml,
}));

vi.mock("../src/modules/rendering/render.service.js", () => ({
  renderLetterHtml: mocks.renderLetterHtml,
  renderPdfBufferFromHtml: mocks.renderPdfBufferFromHtml,
}));

vi.mock("../src/modules/dispatch/adapters/epost-submission-mode.js", () => ({
  isMockEpostProviderName: (providerName: string) => providerName === "epost-oneapi-mock",
}));

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  chain.then = (onFulfilled: (value: unknown[]) => unknown) =>
    Promise.resolve(onFulfilled(result));
  return chain;
}

describe("pdf-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getLatestSnapshot.mockResolvedValue({
      id: "snapshot-1",
      draftId: "draft-1",
      version: 3,
      snapshotData: {
        schemaVersion: 1,
        locale: "en-CH",
        deliveryType: "registered",
        subject: "Termination notice",
        body: "Please accept this cancellation notice effective immediately.",
        enclosureNote: null,
        signatureMode: null,
        tone: null,
        intent: null,
        sender: {
          firstName: "Sam",
          lastName: "Sender",
          company: null,
          addressLine1: "Main street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
        recipient: {
          firstName: "Alex",
          lastName: "Receiver",
          company: "Receiver AG",
          department: null,
          addressLine1: "Market street 2",
          addressLine2: null,
          postalCode: "3000",
          city: "Bern",
          country: "CH",
        },
        attachmentAssetIds: ["11111111-1111-4111-8111-111111111111"],
        signatureAssetId: null,
        estimatedPages: 2,
        metadata: null,
      },
      renderedPdfAssetId: "rendered-asset-1",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
    });

    mocks.renderConfirmationDocumentHtml.mockReturnValue("<html>confirmation</html>");
    mocks.renderLetterHtml.mockReturnValue("<html>letter</html>");
    mocks.renderPdfBufferFromHtml.mockImplementation(async (html: string) => {
      if (html === "<html>confirmation</html>") {
        return {
          pdfBuffer: Buffer.from("front-pdf"),
          pageCount: 1,
        };
      }

      return {
        pdfBuffer: Buffer.from("letter-pdf"),
        pageCount: 2,
      };
    });

    mocks.loadPdf.mockImplementation(async (buffer: Uint8Array) => {
      const value = Buffer.from(buffer).toString("utf8");
      if (value === "front-pdf") {
        return mocks.frontPdf;
      }
      return mocks.letterPdf;
    });
    mocks.createPdf.mockResolvedValue(mocks.bundlePdf);
  });

  it("builds a fresh confirmation bundle from the latest snapshot layout instead of appending a stale stored letter pdf", async () => {
    const selectResults = [
      [
        {
          state: "accepted",
          providerName: "epost-oneapi-mock",
          providerReference: "EPR-T-R-0D2D6C40F706",
          trackingNumber: "98.40.541881.00002354",
          submittedAt: new Date("2026-04-08T12:05:00.000Z"),
          createdAt: new Date("2026-04-08T12:04:00.000Z"),
        },
      ],
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          originalFilename: "contract-scan.pdf",
          storageKey: "attachments/session/contract-scan.pdf",
        },
      ],
    ];

    const db = {
      select: vi
        .fn()
        .mockImplementation(() => makeSelectChain(selectResults.shift() ?? [])),
    };
    const reply = {
      header: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue(undefined),
    };

    const { sendRenderedDraftPdf } =
      await import("../src/modules/rendering/pdf-access.js");
    await sendRenderedDraftPdf(db as never, "draft-1", reply as never);

    expect(mocks.renderLetterHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Termination notice",
        sender: expect.objectContaining({ city: "Zurich" }),
        recipient: expect.objectContaining({ company: "Receiver AG" }),
      }),
      {
        signatureImage: null,
      },
    );
    expect(mocks.renderConfirmationDocumentHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        orderRef: "EP-DRAFT-1",
        providerMode: "mock",
        providerReference: "EPR-T-R-0D2D6C40F706",
        trackingNumber: "98.40.541881.00002354",
        pageCount: 2,
        attachmentNames: ["contract-scan.pdf"],
      }),
    );
    expect(mocks.renderPdfBufferFromHtml).toHaveBeenCalledWith(
      "<html>confirmation</html>",
      {
        margins: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
      },
    );
    expect(mocks.renderPdfBufferFromHtml).toHaveBeenCalledWith("<html>letter</html>");
    expect(mocks.downloadObjectBuffer).not.toHaveBeenCalled();
    expect(mocks.bundlePdf.copyPages).toHaveBeenCalledTimes(2);
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="episto-draft-1-dispatch-statement.pdf"',
    );
    expect(reply.send).toHaveBeenCalledWith(Buffer.from("merged-pdf"));
  });

  it("loads the drawn signature image when rebuilding the confirmation bundle letter pdf", async () => {
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-drawn",
      draftId: "draft-drawn",
      version: 1,
      snapshotData: {
        schemaVersion: 1,
        locale: "en-CH",
        deliveryType: "registered",
        subject: "Termination notice",
        body: "Please accept this cancellation notice effective immediately.",
        enclosureNote: null,
        signatureMode: "drawn",
        tone: null,
        intent: null,
        sender: {
          firstName: "Sam",
          lastName: "Sender",
          company: null,
          addressLine1: "Main street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
        recipient: {
          firstName: "Alex",
          lastName: "Receiver",
          company: "Receiver AG",
          department: null,
          addressLine1: "Market street 2",
          addressLine2: null,
          postalCode: "3000",
          city: "Bern",
          country: "CH",
        },
        attachmentAssetIds: ["11111111-1111-4111-8111-111111111111"],
        signatureAssetId: "22222222-2222-4222-8222-222222222222",
        estimatedPages: 2,
        metadata: null,
      },
      renderedPdfAssetId: "rendered-asset-1",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
    });
    mocks.downloadObjectBuffer.mockResolvedValue({
      buffer: Buffer.from("pngbytes"),
      contentType: "image/png",
    });

    const db = {
      select: vi.fn((fields?: Record<string, unknown>) => {
        const projection = fields ? Object.keys(fields).sort().join(",") : "__all__";
        if (
          projection ===
          "createdAt,providerName,providerReference,state,submittedAt,trackingNumber"
        ) {
          return makeSelectChain([
            {
              state: "accepted",
              providerName: "epost-oneapi-mock",
              providerReference: "EPR-T-R-0D2D6C40F706",
              trackingNumber: "98.40.541881.00002354",
              submittedAt: new Date("2026-04-08T12:05:00.000Z"),
              createdAt: new Date("2026-04-08T12:04:00.000Z"),
            },
          ]);
        }
        if (projection === "id,originalFilename,storageKey") {
          return makeSelectChain([
            {
              id: "11111111-1111-4111-8111-111111111111",
              originalFilename: "contract-scan.pdf",
              storageKey: "attachments/session/contract-scan.pdf",
            },
          ]);
        }
        if (projection === "mimeType,storageKey") {
          return makeSelectChain([
            {
              storageKey: "signatures/session/drawn-signature.png",
              mimeType: "image/png",
            },
          ]);
        }
        return makeSelectChain([]);
      }),
    };
    const reply = {
      header: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue(undefined),
    };

    const { sendRenderedDraftPdf } =
      await import("../src/modules/rendering/pdf-access.js");
    await sendRenderedDraftPdf(db as never, "draft-drawn", reply as never);

    expect(mocks.downloadObjectBuffer).toHaveBeenCalledWith(
      "signatures/session/drawn-signature.png",
    );
    expect(mocks.renderLetterHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureMode: "drawn",
        signatureAssetId: "22222222-2222-4222-8222-222222222222",
      }),
      {
        signatureImage: {
          mimeType: "image/png",
          base64: Buffer.from("pngbytes").toString("base64"),
        },
      },
    );
  });

  it("ignores unsupported signature mime types when rebuilding the confirmation bundle letter pdf", async () => {
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-drawn-invalid",
      draftId: "draft-drawn-invalid",
      version: 1,
      snapshotData: {
        schemaVersion: 1,
        locale: "en-CH",
        deliveryType: "registered",
        subject: "Termination notice",
        body: "Please accept this cancellation notice effective immediately.",
        enclosureNote: null,
        signatureMode: "drawn",
        tone: null,
        intent: null,
        sender: {
          firstName: "Sam",
          lastName: "Sender",
          company: null,
          addressLine1: "Main street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
        recipient: {
          firstName: "Alex",
          lastName: "Receiver",
          company: "Receiver AG",
          department: null,
          addressLine1: "Market street 2",
          addressLine2: null,
          postalCode: "3000",
          city: "Bern",
          country: "CH",
        },
        attachmentAssetIds: [],
        signatureAssetId: "33333333-3333-4333-8333-333333333333",
        estimatedPages: 2,
        metadata: null,
      },
      renderedPdfAssetId: "rendered-asset-invalid",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
    });

    const db = {
      select: vi.fn((fields?: Record<string, unknown>) => {
        const projection = fields ? Object.keys(fields).sort().join(",") : "__all__";
        if (
          projection ===
          "createdAt,providerName,providerReference,state,submittedAt,trackingNumber"
        ) {
          return makeSelectChain([]);
        }
        if (projection === "id,originalFilename,storageKey") {
          return makeSelectChain([]);
        }
        if (projection === "mimeType,storageKey") {
          return makeSelectChain([
            {
              storageKey: "signatures/session/drawn-signature.gif",
              mimeType: "image/gif",
            },
          ]);
        }
        return makeSelectChain([]);
      }),
    };
    const reply = {
      header: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue(undefined),
    };

    const { sendRenderedDraftPdf } =
      await import("../src/modules/rendering/pdf-access.js");
    await sendRenderedDraftPdf(db as never, "draft-drawn-invalid", reply as never);

    expect(mocks.downloadObjectBuffer).not.toHaveBeenCalled();
    expect(mocks.renderLetterHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureMode: "drawn",
        signatureAssetId: "33333333-3333-4333-8333-333333333333",
      }),
      {
        signatureImage: null,
      },
    );
  });

  it("caps the confirmation content summary so the cover sheet stays compact", async () => {
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-long",
      draftId: "draft-long",
      version: 1,
      snapshotData: {
        schemaVersion: 1,
        locale: "en-CH",
        deliveryType: "standard",
        subject: "Long summary",
        body: "Long summary paragraph. ".repeat(40),
        enclosureNote: null,
        signatureMode: null,
        tone: null,
        intent: null,
        sender: {
          firstName: "Sam",
          lastName: "Sender",
          company: null,
          addressLine1: "Main street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
        recipient: {
          firstName: "Alex",
          lastName: "Receiver",
          company: null,
          department: null,
          addressLine1: "Market street 2",
          addressLine2: null,
          postalCode: "3000",
          city: "Bern",
          country: "CH",
        },
        attachmentAssetIds: [],
        signatureAssetId: null,
        estimatedPages: 5,
        metadata: null,
      },
      renderedPdfAssetId: "rendered-asset-long",
      createdAt: new Date("2026-04-08T12:00:00.000Z"),
    });

    const db = {
      select: vi.fn().mockImplementation(() => makeSelectChain([])),
    };
    const reply = {
      header: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue(undefined),
    };

    const { sendRenderedDraftPdf } =
      await import("../src/modules/rendering/pdf-access.js");
    await sendRenderedDraftPdf(db as never, "draft-long", reply as never);

    const confirmationInput = mocks.renderConfirmationDocumentHtml.mock.calls.at(-1)?.[0];
    expect(confirmationInput).toBeDefined();
    expect(confirmationInput?.contentSummary.length).toBeLessThanOrEqual(160);
  });
});
