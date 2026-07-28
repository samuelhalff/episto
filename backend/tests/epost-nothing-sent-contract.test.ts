import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The adapter's side of the refund decision.
 *
 * The submit worker refunds a user only when the letter provably never left,
 * and it will not guess: it refunds exactly the failures the adapter marks.
 * These tests pin what the adapter promises to mark, because getting this
 * wrong costs either a refunded-but-posted letter or a charged-but-unsent one.
 */

const mocks = vi.hoisted(() => ({
  requestJson: vi.fn(),
  createSynchronousDeliveryForm: vi.fn(),
}));

vi.mock("../src/modules/dispatch/adapters/epost-http-client.js", () => ({
  EpostHttpClient: class {
    requestJson = mocks.requestJson;
  },
}));

vi.mock("../src/shared/config/index.js", () => ({
  isEnvLoaded: () => true,
  env: () => ({
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
    EPOST_SUBMISSION_MODE: "live",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
    EPOST_STANDARD_POSTAGE: "A_MAIL",
    EPOST_BASE_URL: "https://epost.test",
    EPOST_CLIENT_ID: "client",
    EPOST_CLIENT_SECRET: "secret",
    EPOST_TIMEOUT_MS: 1000,
  }),
}));

vi.mock("../src/modules/dispatch/adapters/epost-request-builders.js", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "../src/modules/dispatch/adapters/epost-request-builders.js",
  );
  return {
    ...actual,
    createSynchronousDeliveryForm: mocks.createSynchronousDeliveryForm,
  };
});

function buildPackage(overrides: Record<string, unknown> = {}) {
  return {
    draftId: "draft-1",
    snapshotId: "snapshot-1",
    deliveryType: "registered",
    renderedPdf: {
      storageKey: "renders/draft-1/1.pdf",
      filename: "letter.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    },
    attachments: [],
    sender: {
      firstName: "Ada",
      lastName: "Lovelace",
      addressLine1: "Rue du Test 1",
      postalCode: "1201",
      city: "Genève",
      country: "CH",
    },
    recipient: {
      firstName: "Alan",
      lastName: "Turing",
      addressLine1: "Bahnhofstrasse 2",
      postalCode: "8001",
      city: "Zürich",
      country: "CH",
    },
    ...overrides,
  };
}

async function submitAndCatch(pkg: unknown): Promise<unknown> {
  const { EpostDispatchAdapter } =
    await import("../src/modules/dispatch/adapters/epost.adapter.js");
  const adapter = new EpostDispatchAdapter("live");
  try {
    await adapter.submit(pkg as never);
  } catch (err) {
    return err;
  }
  throw new Error("submit() was expected to throw");
}

describe("epost adapter — the 'nothing was sent' promise", () => {
  beforeEach(() => {
    mocks.requestJson.mockReset();
    mocks.createSynchronousDeliveryForm.mockReset().mockResolvedValue(new FormData());
  });

  it("marks a package our own pre-flight refuses", async () => {
    const { isLetterNotSent } =
      await import("../src/modules/dispatch/dispatch-outcome.js");

    // A non-PDF primary document: validatePackage refuses it, and it raises
    // `validation_error` — a family that says nothing about transmission.
    const err = await submitAndCatch(
      buildPackage({
        renderedPdf: {
          storageKey: "renders/draft-1/1.pdf",
          filename: "letter.docx",
          mimeType: "application/msword",
          sizeBytes: 1024,
        },
      }),
    );

    expect(isLetterNotSent(err)).toBe(true);
    expect(mocks.requestJson).not.toHaveBeenCalled();
  });

  it("marks a request it could not even assemble", async () => {
    const { isLetterNotSent } =
      await import("../src/modules/dispatch/dispatch-outcome.js");
    mocks.createSynchronousDeliveryForm.mockRejectedValue(
      new Error("storage read failed"),
    );

    const err = await submitAndCatch(buildPackage());

    expect(isLetterNotSent(err)).toBe(true);
    expect(mocks.requestJson).not.toHaveBeenCalled();
  });

  it("marks a 400/422 the provider answered with", async () => {
    const { isLetterNotSent } =
      await import("../src/modules/dispatch/dispatch-outcome.js");
    const { AppError } = await import("../src/shared/errors/index.js");
    mocks.requestJson.mockRejectedValue(
      new AppError({
        family: "dispatch_rejection",
        statusCode: 422,
        code: "EPOST_REJECTED_REQUEST",
        message: "Recipient address is not deliverable",
        userMessage: "The postal provider rejected this letter.",
      }),
    );

    expect(isLetterNotSent(await submitAndCatch(buildPackage()))).toBe(true);
  });

  it("leaves a transport failure unmarked, because the letter may have landed", async () => {
    const { isLetterNotSent } =
      await import("../src/modules/dispatch/dispatch-outcome.js");
    mocks.requestJson.mockRejectedValue(new Error("socket hang up"));

    expect(isLetterNotSent(await submitAndCatch(buildPackage()))).toBe(false);
  });

  it("leaves a provider outage unmarked", async () => {
    const { isLetterNotSent } =
      await import("../src/modules/dispatch/dispatch-outcome.js");
    const { AppError } = await import("../src/shared/errors/index.js");
    mocks.requestJson.mockRejectedValue(
      new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "EPOST_REQUEST_FAILED",
        message: "Bad gateway",
        userMessage: "Postal dispatch is temporarily unavailable.",
      }),
    );

    expect(isLetterNotSent(await submitAndCatch(buildPackage()))).toBe(false);
  });
});
