import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../src/shared/errors/index.js";

const mocks = vi.hoisted(() => {
  const page = {
    setContent: vi.fn(),
    pdf: vi.fn(),
    close: vi.fn(),
  };
  const browser = {
    connected: true,
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn(),
  };

  return {
    browser,
    page,
    launch: vi.fn(),
    getDb: vi.fn(),
    createFileAsset: vi.fn(),
    uploadObject: vi.fn(),
    setSnapshotPdfAsset: vi.fn(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    schema: {
      draftSnapshots: {
        id: "draft_snapshots.id",
        draftId: "draft_snapshots.draft_id",
        version: "draft_snapshots.version",
        snapshotData: "draft_snapshots.snapshot_data",
        renderedPdfAssetId: "draft_snapshots.rendered_pdf_asset_id",
      },
      draftLetters: {
        id: "draft_letters.id",
        sessionId: "draft_letters.session_id",
      },
      fileAssets: {
        id: "file_assets.id",
      },
    },
  };
});

// Mock puppeteer-core — we can't run a browser in CI
vi.mock("puppeteer-core", () => ({
  default: {
    launch: mocks.launch,
  },
}));

// Mock dependencies
vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    DATABASE_URL: "postgresql://localhost/test",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "test",
    S3_ACCESS_KEY: "test",
    S3_SECRET_KEY: "test",
  }),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("../src/db/index.js", () => ({
  getDb: mocks.getDb,
  schema: mocks.schema,
}));

vi.mock("../src/modules/files/file.service.js", () => ({
  createFileAsset: mocks.createFileAsset,
  renderStorageKey: (draftId: string, version: number) =>
    `renders/${draftId}/${version}.pdf`,
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  uploadObject: mocks.uploadObject,
}));

vi.mock("../src/modules/rendering/snapshot.service.js", () => ({
  setSnapshotPdfAsset: mocks.setSnapshotPdfAsset,
}));

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

function mockDbWithSelectResults(...results: unknown[][]) {
  const remaining = [...results];
  const select = vi
    .fn()
    .mockImplementation(() => makeSelectChain(remaining.shift() ?? []));
  mocks.getDb.mockReturnValue({ select });
  return select;
}

describe("render.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.launch.mockResolvedValue(mocks.browser);
    mocks.page.setContent.mockResolvedValue(undefined);
    mocks.page.pdf.mockResolvedValue(Buffer.from("%PDF-1.7\n1 0 obj\n/Type /Page\n"));
    mocks.page.close.mockResolvedValue(undefined);
    mocks.createFileAsset.mockResolvedValue({ id: "rendered-asset-1" });
    mocks.uploadObject.mockResolvedValue(undefined);
    mocks.setSnapshotPdfAsset.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const { closeBrowser } = await import("../src/modules/rendering/render.service.js");
    await closeBrowser();
  });

  it("exports RenderResult type and renderSnapshotToPdf function", async () => {
    const mod = await import("../src/modules/rendering/render.service.js");
    expect(typeof mod.renderSnapshotToPdf).toBe("function");
    expect(typeof mod.closeBrowser).toBe("function");
  });

  it("renderStorageKey generates correct path", async () => {
    const { renderStorageKey } = await import("../src/modules/files/file.service.js");
    expect(renderStorageKey("draft-123", 1)).toBe("renders/draft-123/1.pdf");
  });

  it("rejects invalid snapshot payloads before launching the browser", async () => {
    mockDbWithSelectResults([
      {
        id: "snapshot-1",
        draftId: "draft-1",
        version: 3,
        snapshotData: {
          schemaVersion: 1,
          locale: "en-CH",
          deliveryType: "registered",
          subject: "Test",
          body: "Hello",
          enclosureNote: null,
          signatureMode: "typed",
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
          attachmentAssetIds: "not-an-array",
          signatureAssetId: null,
          estimatedPages: 1,
          metadata: null,
        },
        renderedPdfAssetId: null,
      },
    ]);

    const { renderSnapshotToPdf } =
      await import("../src/modules/rendering/render.service.js");
    let thrown: unknown;
    try {
      await renderSnapshotToPdf("snapshot-1");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AppError);
    expect(thrown).toMatchObject({
      code: "SNAPSHOT_DATA_INVALID",
    });
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("renders a generated signature block into the final PDF HTML", async () => {
    mockDbWithSelectResults(
      [
        {
          id: "snapshot-2",
          draftId: "draft-2",
          version: 1,
          snapshotData: {
            schemaVersion: 1,
            locale: "en-CH",
            deliveryType: "standard",
            subject: "Account closure",
            body: "Please close the account by the end of the month.",
            enclosureNote: null,
            signatureMode: "typed",
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
            estimatedPages: 1,
            metadata: null,
          },
          renderedPdfAssetId: null,
        },
      ],
      [
        {
          sessionId: "session-2",
        },
      ],
    );

    const { renderSnapshotToPdf } =
      await import("../src/modules/rendering/render.service.js");
    await renderSnapshotToPdf("snapshot-2");

    expect(mocks.page.setContent).toHaveBeenCalledTimes(1);
    const html = mocks.page.setContent.mock.calls[0]?.[0];
    expect(typeof html).toBe("string");
    expect(html).toContain('class="signature-block"');
    expect(html).toContain('class="signature-script">Sam Sender</div>');
    expect(html).toContain('class="signature-name">Sam Sender</div>');
  });
});
