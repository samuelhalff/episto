import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

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
});
