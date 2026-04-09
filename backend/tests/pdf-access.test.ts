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
    );
    expect(mocks.renderConfirmationDocumentHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        orderRef: "SM-DRAFT-1",
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
      'attachment; filename="sendly-draft-1-dispatch-statement.pdf"',
    );
    expect(reply.send).toHaveBeenCalledWith(Buffer.from("merged-pdf"));
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
      select: vi
        .fn()
        .mockImplementation(() => makeSelectChain([])),
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
