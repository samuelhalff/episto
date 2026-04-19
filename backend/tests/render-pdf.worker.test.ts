import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentDb: null as ReturnType<typeof createDbMock> | null,
  createWorker: vi.fn(),
  renderSnapshotToPdf: vi.fn(),
  getPaymentForDraft: vi.fn(),
  enqueueDispatchSubmission: vi.fn(),
  transitionDraftStatus: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createDbMock(currentDraft?: {
  status: string;
  sessionId: string;
  signatureAssuranceLevel?: string;
}) {
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(currentDraft ? [currentDraft] : []),
      })),
    })),
  }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  return { select, update, updateSet, updateWhere };
}

vi.mock("../src/queue/index.js", () => ({
  QUEUE_NAMES: {
    RENDER_PDF: "render-pdf",
  },
  createWorker: mocks.createWorker,
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.currentDb,
  schema: {
    draftLetters: {
      id: "draft_id",
      status: "status",
      sessionId: "session_id",
    },
  },
}));

vi.mock("../src/modules/rendering/render.service.js", () => ({
  renderSnapshotToPdf: mocks.renderSnapshotToPdf,
}));

vi.mock("../src/modules/payments/payment.service.js", () => ({
  getPaymentForDraft: mocks.getPaymentForDraft,
}));

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  enqueueDispatchSubmission: mocks.enqueueDispatchSubmission,
}));

vi.mock("../src/modules/drafting/draft.service.js", () => ({
  transitionDraftStatus: mocks.transitionDraftStatus,
}));

describe("render-pdf worker", () => {
  beforeEach(() => {
    mocks.currentDb = createDbMock({
      status: "rendering",
      sessionId: "session-1",
      signatureAssuranceLevel: "visual",
    });
    mocks.createWorker.mockReset();
    mocks.renderSnapshotToPdf.mockReset();
    mocks.getPaymentForDraft.mockReset();
    mocks.enqueueDispatchSubmission.mockReset();
    mocks.transitionDraftStatus.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.error.mockReset();
  });

  it("returns oversized async renders to collecting and skips payment follow-up", async () => {
    mocks.renderSnapshotToPdf.mockResolvedValue({
      pdfAssetId: "asset-oversize",
      storageKey: "renders/draft-1/1.pdf",
      sizeBytes: 1024,
      pageCount: 6,
    });

    const { processRenderPdfJob } = await import("../src/workers/render-pdf.worker.js");
    const job = {
      data: { snapshotId: "snapshot-1", draftId: "draft-1" },
      log: vi.fn(),
    };

    await processRenderPdfJob(job as never);

    expect(mocks.currentDb?.update).toHaveBeenCalledTimes(1);
    expect(mocks.currentDb?.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedPages: 6,
      }),
    );
    expect(mocks.transitionDraftStatus).toHaveBeenCalledWith(
      mocks.currentDb,
      "draft-1",
      "session-1",
      "collecting",
    );
    expect(mocks.getPaymentForDraft).not.toHaveBeenCalled();
    expect(mocks.enqueueDispatchSubmission).not.toHaveBeenCalled();
    expect(job.log).toHaveBeenCalledWith(
      "PDF rendered with more than 5 pages; returning draft to editing",
    );
  });

  it("uses the centralized transition helper before dispatch follow-up when the draft is ready", async () => {
    mocks.renderSnapshotToPdf.mockResolvedValue({
      pdfAssetId: "asset-ready",
      storageKey: "renders/draft-2/1.pdf",
      sizeBytes: 2048,
      pageCount: 2,
    });
    mocks.getPaymentForDraft.mockResolvedValue({
      id: "payment-1",
      state: "authorized",
    });

    const { processRenderPdfJob } = await import("../src/workers/render-pdf.worker.js");
    const job = {
      data: { snapshotId: "snapshot-2", draftId: "draft-2" },
      log: vi.fn(),
    };

    await processRenderPdfJob(job as never);

    expect(mocks.currentDb?.update).toHaveBeenCalledTimes(1);
    expect(mocks.currentDb?.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedPages: 2,
      }),
    );
    expect(mocks.transitionDraftStatus).toHaveBeenCalledWith(
      mocks.currentDb,
      "draft-2",
      "session-1",
      "ready",
    );
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-2",
      snapshotId: "snapshot-2",
      paymentId: "payment-1",
    });
  });

  it("routes non-visual drafts into ready_to_sign and skips dispatch follow-up", async () => {
    mocks.currentDb = createDbMock({
      status: "rendering",
      sessionId: "session-1",
      signatureAssuranceLevel: "qualified",
    });
    mocks.renderSnapshotToPdf.mockResolvedValue({
      pdfAssetId: "asset-qes",
      storageKey: "renders/draft-3/1.pdf",
      sizeBytes: 4096,
      pageCount: 2,
    });

    const { processRenderPdfJob } = await import("../src/workers/render-pdf.worker.js");
    const job = {
      data: { snapshotId: "snapshot-3", draftId: "draft-3" },
      log: vi.fn(),
    };

    await processRenderPdfJob(job as never);

    expect(mocks.transitionDraftStatus).toHaveBeenCalledWith(
      mocks.currentDb,
      "draft-3",
      "session-1",
      "ready_to_sign",
    );
    expect(mocks.getPaymentForDraft).not.toHaveBeenCalled();
    expect(mocks.enqueueDispatchSubmission).not.toHaveBeenCalled();
  });
});
