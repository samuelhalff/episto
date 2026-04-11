import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let enqueueRenderJob: ReturnType<typeof vi.fn>;
let renderSnapshotToPdfMock: ReturnType<typeof vi.fn>;

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  (chain as { then: unknown }).then = (
    onFulfilled: (value: unknown[]) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockResolvedValue(undefined);
  return chain;
}

describe("draft review route", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetModules();
    enqueueRenderJob = vi.fn().mockResolvedValue(undefined);
    renderSnapshotToPdfMock = vi.fn();

    const selectResults = [
      [
        {
          id: "sender-1",
          firstName: "Sam",
          lastName: "Sender",
          company: null,
          addressLine1: "Main street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
      ],
      [
        {
          id: "recipient-1",
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
      ],
      [],
    ];

    const select = vi
      .fn()
      .mockImplementation(() => makeSelectChain(selectResults.shift() ?? []));
    const update = vi.fn().mockImplementation(() => makeUpdateChain());

    vi.doMock("../src/db/index.js", () => ({
      getDb: () => ({ select, update }),
      schema: new Proxy({}, { get: () => ({}) }),
    }));

    vi.doMock("../src/modules/sessions/session.middleware.js", () => ({
      requireSession: vi.fn().mockImplementation(
        async (request: { session?: unknown }) => {
          request.session = {
            id: "review-session",
            type: "guest",
            locale: "en-CH",
            email: null,
            resumeTokenExpiresAt: new Date("2030-01-01"),
            expiresAt: new Date("2030-01-01"),
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
          };
        },
      ),
      COOKIE_NAME: "session",
    }));

    vi.doMock("../src/modules/drafting/draft.service.js", () => ({
      createDraft: vi.fn(),
      getDraftById: vi.fn().mockResolvedValue({
        id: "draft-review",
        sessionId: "review-session",
        status: "fields_complete",
        locale: "en-CH",
        deliveryType: "standard",
        subject: "Long letter",
        body: "This body eventually renders to more than five pages.",
        enclosureNote: null,
        signatureMode: null,
        senderProfileId: "sender-1",
        recipientProfileId: "recipient-1",
        estimatedPages: 1,
        schemaVersion: 1,
        tone: null,
        intent: null,
        metadata: null,
        updatedAt: new Date("2026-01-01"),
      }),
      listDraftsBySession: vi.fn(),
      updateDraft: vi.fn(),
      transitionDraftStatus: vi
        .fn()
        .mockImplementation(async (_db: unknown, _draftId: string, _sessionId: string, status: string) => ({
          id: "draft-review",
          status,
        })),
    }));

    vi.doMock("../src/modules/drafting/profile.service.js", () => ({
      createSenderProfile: vi.fn(),
      createRecipientProfile: vi.fn(),
    }));

    vi.doMock("../src/modules/rendering/snapshot.service.js", () => ({
      createSnapshot: vi.fn().mockResolvedValue({
        id: "snapshot-review",
        draftId: "draft-review",
        createdAt: new Date("2026-01-01"),
      }),
      getLatestSnapshot: vi.fn().mockResolvedValue(null),
    }));

    vi.doMock("../src/modules/rendering/pdf-access.js", () => ({
      sendRenderedDraftPdf: vi.fn(),
    }));

    vi.doMock("../src/modules/rendering/render.service.js", () => ({
      renderSnapshotToPdf: renderSnapshotToPdfMock,
    }));

    vi.doMock("../src/modules/dispatch/dispatch-quote.service.js", () => ({
      resolveDisplayDispatchQuoteForDraft: vi.fn().mockResolvedValue({
        quote: { totalCents: 505 },
      }),
    }));

    vi.doMock("../src/modules/analytics/index.js", () => ({
      recordEvent: vi.fn(),
    }));

    vi.doMock("../src/queue/index.js", () => ({
      getQueue: vi.fn().mockReturnValue({
        add: enqueueRenderJob,
      }),
      QUEUE_NAMES: { RENDER_PDF: "render-pdf" },
    }));

    vi.doMock("../src/modules/ai/index.js", () => ({
      handleComposeFromContext: vi.fn(),
    }));

    vi.doMock("../src/modules/drafting/review-validation.js", () => ({
      getReviewMissingFields: vi.fn().mockReturnValue([]),
    }));

    vi.doMock("../src/modules/payments/payment-cancellation.service.js", () => ({
      cancelPendingDraftPayment: vi.fn(),
    }));

    vi.doMock("../src/shared/logging/index.js", () => ({
      createLogger: () => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      }),
    }));

    const { draftRoutes } = await import("../src/modules/drafting/draft.routes.js");

    app = Fastify({ logger: false });
    app.setErrorHandler((error, _request, reply) => {
      const typedError = error as {
        statusCode?: number;
        code?: string;
        message?: string;
        fields?: unknown;
      };
      reply.status(typedError.statusCode ?? 500).send({
        code: typedError.code ?? "INTERNAL",
        message: typedError.message ?? "Unknown error",
        fields: typedError.fields ?? [],
      });
    });
    await app.register(draftRoutes);
  });

  afterEach(async () => {
    await app.close();
    vi.resetModules();
  });

  it("enqueues PDF rendering and returns the review snapshot without blocking on Puppeteer", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-review/review",
      payload: {},
    });

    const { transitionDraftStatus } = await import("../src/modules/drafting/draft.service.js");

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      snapshot: {
        id: "snapshot-review",
        draftId: "draft-review",
        priceCents: 505,
      },
    });
    expect(enqueueRenderJob).toHaveBeenCalledWith(
      "render-pdf",
      {
        snapshotId: "snapshot-review",
        draftId: "draft-review",
      },
      {
        jobId: "snapshot-snapshot-review",
      },
    );
    expect(renderSnapshotToPdfMock).not.toHaveBeenCalled();
    expect(transitionDraftStatus).toHaveBeenCalledWith(
      expect.anything(),
      "draft-review",
      "review-session",
      "reviewed",
    );
    expect(transitionDraftStatus).toHaveBeenCalledWith(
      expect.anything(),
      "draft-review",
      "review-session",
      "rendering",
    );
    expect(transitionDraftStatus).not.toHaveBeenCalledWith(
      expect.anything(),
      "draft-review",
      "review-session",
      "ready",
    );
  });
});
