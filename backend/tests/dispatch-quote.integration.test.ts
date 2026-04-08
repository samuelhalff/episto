import { randomUUID } from "node:crypto";

import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Draft preview HTTP route test (mocked dependencies, no real DB required)
// ---------------------------------------------------------------------------

describe("draft preview route", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetModules();

    // Drizzle query chain — resolves to [] at any await point in the chain
    function makeChain() {
      const chain: Record<string, unknown> = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      // Thenable so `await db.select()...` resolves to an empty array
      (chain as { then: unknown }).then = (
        onFulfilled: (v: unknown[]) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => Promise.resolve([]).then(onFulfilled, onRejected);
      return chain;
    }

    vi.doMock("../src/db/index.js", () => ({
      getDb: () => ({ select: vi.fn().mockImplementation(() => makeChain()) }),
      schema: new Proxy({}, { get: () => ({}) }),
    }));

    vi.doMock("../src/modules/sessions/session.middleware.js", () => ({
      requireSession: vi.fn().mockImplementation(
        async (request: { session?: unknown }) => {
          request.session = {
            id: "preview-session",
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
      getDraftById: vi.fn().mockResolvedValue({
        id: "preview-draft",
        sessionId: "preview-session",
        status: "collecting",
        locale: "en-CH",
        deliveryType: "registered",
        subject: "Test Subject",
        body: "Test body",
        enclosureNote: null,
        signatureMode: "typed",
        signatureAssetId: null,
        senderProfileId: null,
        recipientProfileId: null,
        estimatedPages: 1,
        schemaVersion: 1,
        tone: "formal",
        intent: "cancellation",
        metadata: null,
        updatedAt: new Date("2026-01-01"),
      }),
      createDraft: vi.fn(),
      listDraftsBySession: vi.fn(),
      updateDraft: vi.fn(),
      transitionDraftStatus: vi.fn(),
    }));

    vi.doMock("../src/modules/dispatch/dispatch-quote.service.js", () => ({
      resolveDisplayDispatchQuoteForDraft: vi.fn().mockResolvedValue({
        quote: {
          draftId: "preview-draft",
          snapshotId: null,
          deliveryType: "registered",
          providerQuotedCents: 578,
          swissMailMarkupCents: 340,
          totalCents: 918,
          currency: "CHF",
          lineItems: [],
          providerQuoteReference: null,
          attachmentHandling: "excluded",
        },
        meta: { source: "matrix", quotedAt: null, expiresAt: null },
      }),
    }));
    vi.doMock("../src/modules/pricing/index.js", () => ({
      calculatePrice: vi.fn().mockReturnValue({
        baseCents: 110,
        deliverySurchargeCents: 340,
        pageSurchargeCents: 0,
        attachmentSurchargeCents: 0,
        totalCents: 450,
      }),
    }));

    // Stubs for modules imported by draft.routes.ts but not invoked on preview
    vi.doMock("../src/modules/drafting/profile.service.js", () => ({
      createSenderProfile: vi.fn(),
      createRecipientProfile: vi.fn(),
    }));
    vi.doMock("../src/modules/rendering/snapshot.service.js", () => ({
      createSnapshot: vi.fn(),
      getLatestSnapshot: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("../src/modules/rendering/pdf-access.js", () => ({
      sendRenderedDraftPdf: vi.fn(),
    }));
    vi.doMock("../src/modules/payments/payment.service.js", () => ({
      getPaymentForDraft: vi.fn(),
      transitionPaymentState: vi.fn(),
    }));
    vi.doMock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
      cancelPaymentIntent: vi.fn(),
    }));
    vi.doMock("../src/modules/analytics/index.js", () => ({
      recordEvent: vi.fn(),
    }));
    vi.doMock("../src/queue/index.js", () => ({
      getQueue: vi.fn(),
      QUEUE_NAMES: { RENDER_PDF: "render-pdf" },
    }));
    vi.doMock("../src/modules/ai/index.js", () => ({
      handleComposeFromContext: vi.fn(),
    }));
    vi.doMock("../src/modules/drafting/review-validation.js", () => ({
      getReviewMissingFields: vi.fn().mockReturnValue([]),
    }));

    const { draftRoutes } = await import("../src/modules/drafting/draft.routes.js");

    app = Fastify({ logger: false });
    app.setErrorHandler((error, _request, reply) => {
      const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
      reply.status(statusCode).send({ error: String(error) });
    });
    await app.register(draftRoutes);
  });

  afterEach(async () => {
    await app.close();
    // Unmock modules that the integration tests below import dynamically
    vi.unmock("../src/modules/dispatch/dispatch-quote.service.js");
    vi.unmock("../src/shared/config/index.js");
    vi.resetModules();
  });

  it("returns preview price from the shared quote resolver instead of calculatePrice", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/drafts/preview-draft/preview",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().preview.priceCents).toBeGreaterThan(0);
  });

  it("falls back to the base reference price before the first draft exists", async () => {
    const draftService = await import("../src/modules/drafting/draft.service.js");
    const dispatchQuoteService = await import("../src/modules/dispatch/dispatch-quote.service.js");
    const pricing = await import("../src/modules/pricing/index.js");

    vi.mocked(draftService.getDraftById).mockResolvedValueOnce({
      id: "preview-draft",
      sessionId: "preview-session",
      status: "collecting",
      locale: "en-CH",
      deliveryType: "registered",
      subject: null,
      body: null,
      enclosureNote: null,
      signatureMode: "typed",
      signatureAssetId: null,
      senderProfileId: null,
      recipientProfileId: null,
      estimatedPages: null,
      schemaVersion: 1,
      tone: "formal",
      intent: "cancellation",
      metadata: null,
      updatedAt: new Date("2026-01-01"),
    });

    const response = await app.inject({
      method: "GET",
      url: "/drafts/preview-draft/preview",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().preview.priceCents).toBe(450);
    expect(pricing.calculatePrice).toHaveBeenCalledWith("registered");
    expect(dispatchQuoteService.resolveDisplayDispatchQuoteForDraft).not.toHaveBeenCalled();
  });
});

import { schema } from "../src/db/index.js";
import type { DispatchAdapter } from "../src/modules/dispatch/adapters/postal.adapter.js";
import {
  createSnapshot,
  setSnapshotPdfAsset,
} from "../src/modules/rendering/snapshot.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

async function seedSessionAndDraft(options?: {
  estimatedPages?: number | null;
  deliveryType?: "standard" | "registered";
}) {
  const harness = await createIntegrationDb();
  const sessionId = randomUUID();
  const draftId = randomUUID();

  await harness.db.insert(schema.sessions).values({
    id: sessionId,
    type: "guest",
    email: "integration@example.com",
    resumeTokenHash: `resume-${randomUUID()}`,
    resumeTokenExpiresAt: new Date("2030-01-01T00:00:00Z"),
    locale: "en-CH",
    expiresAt: new Date("2030-01-02T00:00:00Z"),
  });

  await harness.db.insert(schema.draftLetters).values({
    id: draftId,
    sessionId,
    status: "ready",
    locale: "en-CH",
    deliveryType: options?.deliveryType ?? "registered",
    subject: "Subject",
    body: "Body",
    estimatedPages: options?.estimatedPages ?? null,
  });

  return { harness, sessionId, draftId };
}

describeIfIntegrationDb("dispatch quote integration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    vi.resetModules();

    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  it("normalizes missing estimatedPages when creating a snapshot", async () => {
    const { harness, draftId } = await seedSessionAndDraft();
    cleanup = harness.cleanup;

    const snapshot = await createSnapshot(harness.db, draftId, {
      schemaVersion: 1,
      locale: "en-CH",
      deliveryType: "registered",
      subject: "Subject",
      body: "Body",
      enclosureNote: null,
      signatureMode: "typed",
      tone: "formal",
      intent: "cancellation",
      sender: {
        firstName: "Sam",
        lastName: "Example",
        company: null,
        addressLine1: "Rue Example 1",
        addressLine2: null,
        postalCode: "1205",
        city: "Geneva",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "Swisscom AG",
        department: null,
        addressLine1: "Alte Tiefenaustrasse 6",
        addressLine2: null,
        postalCode: "3050",
        city: "Bern",
        country: "CH",
      },
      attachmentAssetIds: [],
      signatureAssetId: null,
      metadata: null,
    });

    const [storedSnapshot] = await harness.db
      .select({ snapshotData: schema.draftSnapshots.snapshotData })
      .from(schema.draftSnapshots)
      .where(eq(schema.draftSnapshots.id, snapshot.id))
      .limit(1);

    expect(storedSnapshot).toBeDefined();
    expect(
      (storedSnapshot?.snapshotData as { estimatedPages?: number | null }).estimatedPages,
    ).toBeNull();
  });

  it("persists the rendered page count back into the snapshot after PDF generation", async () => {
    const { harness, draftId, sessionId } = await seedSessionAndDraft();
    cleanup = harness.cleanup;

    const snapshot = await createSnapshot(harness.db, draftId, {
      schemaVersion: 1,
      locale: "en-CH",
      deliveryType: "registered",
      subject: "Subject",
      body: "Body",
      enclosureNote: null,
      signatureMode: "typed",
      tone: "formal",
      intent: "cancellation",
      sender: {
        firstName: "Sam",
        lastName: "Example",
        company: null,
        addressLine1: "Rue Example 1",
        addressLine2: null,
        postalCode: "1205",
        city: "Geneva",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "Swisscom AG",
        department: null,
        addressLine1: "Alte Tiefenaustrasse 6",
        addressLine2: null,
        postalCode: "3050",
        city: "Bern",
        country: "CH",
      },
      attachmentAssetIds: [],
      signatureAssetId: null,
      metadata: null,
    });

    const renderedPdfAssetId = randomUUID();

    await harness.db.insert(schema.fileAssets).values({
      id: renderedPdfAssetId,
      sessionId,
      draftId,
      kind: "rendered_pdf",
      storageKey: `renders/${draftId}/1.pdf`,
      originalFilename: "letter-v1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
      status: "active",
    });

    await setSnapshotPdfAsset(harness.db, snapshot.id, renderedPdfAssetId, 4);

    const [storedSnapshot] = await harness.db
      .select({
        renderedPdfAssetId: schema.draftSnapshots.renderedPdfAssetId,
        snapshotData: schema.draftSnapshots.snapshotData,
      })
      .from(schema.draftSnapshots)
      .where(eq(schema.draftSnapshots.id, snapshot.id))
      .limit(1);

    expect(storedSnapshot?.renderedPdfAssetId).toBe(renderedPdfAssetId);
    expect(
      (storedSnapshot?.snapshotData as { estimatedPages?: number | null }).estimatedPages,
    ).toBe(4);
  });

  it("quotes legacy snapshots that are missing estimatedPages by falling back to the draft page count", async () => {
    const { harness, draftId, sessionId } = await seedSessionAndDraft({
      estimatedPages: 3,
    });
    cleanup = harness.cleanup;

    const snapshotId = randomUUID();
    const renderedPdfAssetId = randomUUID();
    const quotePrice = vi.fn(async (dispatchPackage) => ({
      draftId: dispatchPackage.draftId,
      snapshotId: dispatchPackage.snapshotId,
      deliveryType: dispatchPackage.deliveryType,
      providerQuotedCents: 720,
      swissMailMarkupCents: 340,
      totalCents: 1060,
      currency: "CHF" as const,
      lineItems: [],
      providerQuoteReference: "fake-preview",
      attachmentHandling: "excluded" as const,
    }));

    const fakeAdapter: DispatchAdapter = {
      getCapabilities() {
        return {
          providerName: "test-provider",
          attachmentPolicy: {
            maxAttachmentsPerDraft: 5,
            allowedMimeTypes: ["application/pdf"],
          },
        };
      },
      quotePrice,
      async submit() {
        throw new Error("not used in this test");
      },
      async checkStatus() {
        throw new Error("not used in this test");
      },
    };

    const { setDispatchAdapter } =
      await import("../src/modules/dispatch/adapters/postal.adapter.js");
    const { getDispatchQuoteForDraft } =
      await import("../src/modules/dispatch/dispatch-quote.service.js");

    setDispatchAdapter(fakeAdapter);

    await harness.db.insert(schema.fileAssets).values({
      id: renderedPdfAssetId,
      sessionId,
      draftId,
      kind: "rendered_pdf",
      storageKey: `renders/${draftId}/1.pdf`,
      originalFilename: "letter-v1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
      status: "active",
    });

    await harness.db.insert(schema.draftSnapshots).values({
      id: snapshotId,
      draftId,
      version: 1,
      schemaVersion: 1,
      renderedPdfAssetId,
      snapshotData: {
        schemaVersion: 1,
        locale: "en-CH",
        deliveryType: "registered",
        subject: "Subject",
        body: "Body",
        enclosureNote: null,
        signatureMode: "typed",
        tone: "formal",
        intent: "cancellation",
        sender: {
          firstName: "Sam",
          lastName: "Example",
          company: null,
          addressLine1: "Rue Example 1",
          addressLine2: null,
          postalCode: "1205",
          city: "Geneva",
          country: "CH",
        },
        recipient: {
          firstName: null,
          lastName: null,
          company: "Swisscom AG",
          department: null,
          addressLine1: "Alte Tiefenaustrasse 6",
          addressLine2: null,
          postalCode: "3050",
          city: "Bern",
          country: "CH",
        },
        attachmentAssetIds: [],
        signatureAssetId: null,
        metadata: null,
      },
    });

    const quote = await getDispatchQuoteForDraft(harness.db, draftId);

    expect(quote.totalCents).toBe(1060);
    expect(quotePrice).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId,
        snapshotId,
        estimatedPages: 3,
      }),
    );
  });

  it("refuses to quote when neither the snapshot nor the draft has a resolved page count", async () => {
    const { harness, draftId, sessionId } = await seedSessionAndDraft({
      estimatedPages: null,
    });
    cleanup = harness.cleanup;

    const snapshotId = randomUUID();
    const renderedPdfAssetId = randomUUID();
    const { getDispatchQuoteForDraft } =
      await import("../src/modules/dispatch/dispatch-quote.service.js");

    await harness.db.insert(schema.fileAssets).values({
      id: renderedPdfAssetId,
      sessionId,
      draftId,
      kind: "rendered_pdf",
      storageKey: `renders/${draftId}/1.pdf`,
      originalFilename: "letter-v1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
      status: "active",
    });

    await harness.db.insert(schema.draftSnapshots).values({
      id: snapshotId,
      draftId,
      version: 1,
      schemaVersion: 1,
      renderedPdfAssetId,
      snapshotData: {
        schemaVersion: 1,
        locale: "en-CH",
        deliveryType: "registered",
        subject: "Subject",
        body: "Body",
        enclosureNote: null,
        signatureMode: "typed",
        tone: "formal",
        intent: "cancellation",
        sender: {
          firstName: "Sam",
          lastName: "Example",
          company: null,
          addressLine1: "Rue Example 1",
          addressLine2: null,
          postalCode: "1205",
          city: "Geneva",
          country: "CH",
        },
        recipient: {
          firstName: null,
          lastName: null,
          company: "Swisscom AG",
          department: null,
          addressLine1: "Alte Tiefenaustrasse 6",
          addressLine2: null,
          postalCode: "3050",
          city: "Bern",
          country: "CH",
        },
        attachmentAssetIds: [],
        signatureAssetId: null,
        metadata: null,
      },
    });

    await expect(getDispatchQuoteForDraft(harness.db, draftId)).rejects.toMatchObject({
      family: "validation_error",
      statusCode: 400,
      message: "Final page count is not ready yet.",
    });
  });

  it("can build a display quote for first review without requiring a snapshot", async () => {
    const { harness, draftId } = await seedSessionAndDraft({
      estimatedPages: 2,
      deliveryType: "registered",
    });
    cleanup = harness.cleanup;

    const versionId = randomUUID();
    await harness.db.insert(schema.providerRateMatrixVersions).values({
      id: versionId,
      providerName: "epost",
      status: "active",
      verifiedAt: new Date(),
      effectiveAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await harness.db.insert(schema.providerRateMatrixEntries).values({
      versionId,
      postage: "REGISTERED",
      numberOfPage: 2,
      attachmentMode: "none",
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "LEFT",
      duplex: false,
      providerQuotedCents: 578,
      currency: "CHF",
    });

    const { loadEnv } = await import("../src/shared/config/index.js");
    loadEnv();

    const { resolveDisplayDispatchQuoteForDraft } =
      await import("../src/modules/dispatch/dispatch-quote.service.js");

    const result = await resolveDisplayDispatchQuoteForDraft(harness.db, draftId);

    expect(result.meta.source).toBe("matrix");
    expect(result.quote.totalCents).toBeGreaterThan(0);
  });

  it("resolves a payment quote via the live provider on a cache miss", async () => {
    const { harness, draftId } = await seedSessionAndDraft({
      estimatedPages: 2,
      deliveryType: "registered",
    });
    cleanup = harness.cleanup;

    await createSnapshot(harness.db, draftId, {
      schemaVersion: 1,
      locale: "en-CH",
      deliveryType: "registered",
      subject: "Subject",
      body: "Body",
      enclosureNote: null,
      signatureMode: "typed",
      tone: "formal",
      intent: "cancellation",
      sender: {
        firstName: "Sam",
        lastName: "Example",
        company: null,
        addressLine1: "Rue Example 1",
        addressLine2: null,
        postalCode: "1205",
        city: "Geneva",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "Swisscom AG",
        department: null,
        addressLine1: "Alte Tiefenaustrasse 6",
        addressLine2: null,
        postalCode: "3050",
        city: "Bern",
        country: "CH",
      },
      attachmentAssetIds: [],
      signatureAssetId: null,
      metadata: null,
    });

    const quotePrice = vi.fn(async (dispatchPackage) => ({
      draftId: dispatchPackage.draftId,
      snapshotId: dispatchPackage.snapshotId,
      deliveryType: dispatchPackage.deliveryType,
      providerQuotedCents: 578,
      swissMailMarkupCents: 340,
      totalCents: 918,
      currency: "CHF" as const,
      lineItems: [],
      providerQuoteReference: "live-preview-pay-123",
      attachmentHandling: "excluded" as const,
    }));

    const fakeAdapter: DispatchAdapter = {
      getCapabilities() {
        return {
          providerName: "test-provider",
          attachmentPolicy: {
            maxAttachmentsPerDraft: 5,
            allowedMimeTypes: ["application/pdf"],
          },
        };
      },
      quotePrice,
      async submit() {
        throw new Error("not used in this test");
      },
      async checkStatus() {
        throw new Error("not used in this test");
      },
    };

    const { loadEnv } = await import("../src/shared/config/index.js");
    loadEnv();

    const { setDispatchAdapter } =
      await import("../src/modules/dispatch/adapters/postal.adapter.js");
    const { resolvePaymentDispatchQuoteForDraft } =
      await import("../src/modules/dispatch/dispatch-quote.service.js");

    setDispatchAdapter(fakeAdapter);

    const result = await resolvePaymentDispatchQuoteForDraft(harness.db, draftId);

    expect(result.meta.source).toBe("live");
    expect(result.quote.totalCents).toBe(918);
    expect(result.quote.providerQuoteReference).toBe("live-preview-pay-123");
    expect(quotePrice).toHaveBeenCalledOnce();
  });

  it("live quote cache entries receive an expiresAt derived from LIVE_DISPATCH_QUOTE_TTL_MINUTES", async () => {
    const { harness, draftId } = await seedSessionAndDraft({
      estimatedPages: 2,
      deliveryType: "registered",
    });
    cleanup = harness.cleanup;

    await createSnapshot(harness.db, draftId, {
      schemaVersion: 1,
      locale: "en-CH",
      deliveryType: "registered",
      subject: "Subject",
      body: "Body",
      enclosureNote: null,
      signatureMode: "typed",
      tone: "formal",
      intent: "cancellation",
      sender: {
        firstName: "Sam",
        lastName: "Example",
        company: null,
        addressLine1: "Rue Example 1",
        addressLine2: null,
        postalCode: "1205",
        city: "Geneva",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "Swisscom AG",
        department: null,
        addressLine1: "Alte Tiefenaustrasse 6",
        addressLine2: null,
        postalCode: "3050",
        city: "Bern",
        country: "CH",
      },
      attachmentAssetIds: [],
      signatureAssetId: null,
      metadata: null,
    });

    const quotePrice = vi.fn(async (dispatchPackage) => ({
      draftId: dispatchPackage.draftId,
      snapshotId: dispatchPackage.snapshotId,
      deliveryType: dispatchPackage.deliveryType,
      providerQuotedCents: 578,
      swissMailMarkupCents: 340,
      totalCents: 918,
      currency: "CHF" as const,
      lineItems: [],
      providerQuoteReference: "live-ttl-test",
      attachmentHandling: "excluded" as const,
    }));

    const fakeAdapter: DispatchAdapter = {
      getCapabilities() {
        return {
          providerName: "test-provider",
          attachmentPolicy: {
            maxAttachmentsPerDraft: 5,
            allowedMimeTypes: ["application/pdf"],
          },
        };
      },
      quotePrice,
      async submit() { throw new Error("not used"); },
      async checkStatus() { throw new Error("not used"); },
    };

    const { loadEnv } = await import("../src/shared/config/index.js");
    loadEnv();

    const { setDispatchAdapter } =
      await import("../src/modules/dispatch/adapters/postal.adapter.js");
    const { resolvePaymentDispatchQuoteForDraft } =
      await import("../src/modules/dispatch/dispatch-quote.service.js");

    setDispatchAdapter(fakeAdapter);

    const before = Date.now();
    const result = await resolvePaymentDispatchQuoteForDraft(harness.db, draftId);
    const after = Date.now();

    expect(result.meta.expiresAt).not.toBeNull();
    const expiresMs = result.meta.expiresAt!.getTime();
    // Default TTL is 30 minutes; assert expiresAt is roughly generatedAt + TTL
    const expectedMin = before + 29 * 60 * 1000;
    const expectedMax = after + 31 * 60 * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresMs).toBeLessThanOrEqual(expectedMax);

    // Verify it was persisted to the cache with the expiry
    const [cached] = await harness.db
      .select({ expiresAt: schema.draftQuoteCache.expiresAt })
      .from(schema.draftQuoteCache)
      .where(eq(schema.draftQuoteCache.draftId, draftId))
      .limit(1);
    expect(cached?.expiresAt).not.toBeNull();
    expect(cached!.expiresAt!.getTime()).toBeGreaterThanOrEqual(expectedMin);
  });
});
