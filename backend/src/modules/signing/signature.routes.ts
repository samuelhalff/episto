import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { AppError, notFoundError } from "../../shared/errors/index.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import {
  capturePaymentIntent,
  cancelPaymentIntent,
} from "../payments/adapters/stripe.adapter.js";
import {
  getPaymentAttemptById,
  getPaymentForDraft,
  transitionPaymentState,
} from "../payments/payment.service.js";
import { enqueueDispatchIfEligible } from "../payments/payment-route-helpers.js";
import { buildDraftFulfillmentResponse } from "./fulfillment-response.service.js";
import {
  syncDraftFulfillmentFromPaymentState,
  syncDraftFulfillmentFromSignatureSessionStatus,
} from "./fulfillment.service.js";
import { getSwissSignProvider } from "./provider-factory.js";
import { assertSignatureFlowSupported } from "./signature-availability.js";
import { attachSignedDocumentToSignatureSession } from "./signed-document.service.js";
import { isSwissSignFlowMode } from "./signature-flow.js";
import {
  createSignatureSession,
  getLatestSignatureSession,
  getSignatureSessionByProviderSessionId,
  recordSignatureEvent,
  transitionSignatureSessionStatus,
  type SignatureSessionRow,
} from "./signature-session.service.js";
import {
  buildSwissIdAuthorizeUrl,
  createSwissIdAuthTransientState,
  loadSwissIdDiscovery,
  parseSwissIdCallbackQuery,
} from "./swissid/oidc.service.js";
import type {
  SignatureEligibilityReasonValue,
  SignatureEligibilityStatusValue,
  SignatureFlowModeValue,
} from "@episto/shared";

const CreateSignatureSessionBody = z.object({
  returnUrl: z.string().url(),
});

const MockSignatureCallbackBody = z.object({
  outcome: z.enum(["completed", "failed", "expired", "in_progress"]).default("completed"),
});

function getRequestBaseUrl(request: FastifyRequest): string {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto =
    typeof forwardedProto === "string" && forwardedProto.length > 0
      ? forwardedProto.split(",")[0]
      : request.protocol;
  const host = request.headers.host;

  if (!host) {
    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "REQUEST_HOST_MISSING",
      message: "Request is missing a host header.",
      userMessage: "The signature request could not be prepared.",
      userAction: "Please try again.",
    });
  }

  return `${proto}://${host}`;
}

async function getScopedDraft(request: FastifyRequest<{ Params: { draftId: string } }>) {
  const session = getRequiredSession(request);
  const db = getDb();
  const { draftId } = request.params;

  const [draft] = await db
    .select({
      id: schema.draftLetters.id,
      sessionId: schema.draftLetters.sessionId,
      locale: schema.draftLetters.locale,
      status: schema.draftLetters.status,
      signatureAssuranceLevel: schema.draftLetters.signatureAssuranceLevel,
      signatureFlowMode: schema.draftLetters.signatureFlowMode,
      fulfillmentStatus: schema.draftLetters.fulfillmentStatus,
      senderProfileId: schema.draftLetters.senderProfileId,
    })
    .from(schema.draftLetters)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, session.id),
      ),
    )
    .limit(1);

  if (!draft) {
    throw notFoundError("draft");
  }

  assertSignatureFlowSupported(draft);

  if (!isSwissSignFlowMode(draft.signatureFlowMode)) {
    throw new AppError({
      family: "policy_refusal",
      statusCode: 409,
      code: "SIGNATURE_NOT_REQUIRED",
      message: `Draft ${draftId} is not using a SwissSign signature flow.`,
      userMessage: "This letter does not require SwissSign signing.",
      userAction: "Continue with the standard checkout flow.",
    });
  }

  return { db, session, draft };
}

async function getSignerDisplayName(
  db: ReturnType<typeof getDb>,
  draft: Awaited<ReturnType<typeof getScopedDraft>>["draft"],
): Promise<string> {
  if (!draft.senderProfileId) {
    return "Swiss Mail signer";
  }

  const [sender] = await db
    .select({
      firstName: schema.senderProfiles.firstName,
      lastName: schema.senderProfiles.lastName,
      company: schema.senderProfiles.company,
    })
    .from(schema.senderProfiles)
    .where(eq(schema.senderProfiles.id, draft.senderProfileId))
    .limit(1);

  if (!sender) {
    return "Swiss Mail signer";
  }

  const fullName = [sender.firstName, sender.lastName].filter(Boolean).join(" ").trim();
  return fullName || sender.company || "Swiss Mail signer";
}

async function getOrCreateEligibilitySession(input: {
  db: ReturnType<typeof getDb>;
  draftId: string;
  sessionId: string;
  signatureFlowMode: SignatureFlowModeValue;
  eligibilityStatus: SignatureEligibilityStatusValue;
  eligibilityReasons: SignatureEligibilityReasonValue[];
}): Promise<SignatureSessionRow> {
  const existing = await getLatestSignatureSession(input.db, input.draftId);
  const targetStatus =
    input.eligibilityStatus === "blocked"
      ? "eligibility_pending"
      : "eligibility_confirmed";

  if (
    existing &&
    !existing.paymentAttemptId &&
    existing.status !== "signed_document_attached"
  ) {
    return transitionSignatureSessionStatus(input.db, existing.id, targetStatus, {
      eligibilityStatus: input.eligibilityStatus,
      eligibilityReasons: input.eligibilityReasons,
      failureReason:
        targetStatus === "eligibility_pending" ? null : existing.failureReason,
      completedAt: null,
    });
  }

  return createSignatureSession(input.db, {
    draftId: input.draftId,
    sessionId: input.sessionId,
    signatureFlowMode: input.signatureFlowMode,
    provider:
      env().SIGNATURE_PROVIDER_MODE === "swisssign" ? "swisssign" : "swisssign_mock",
    eligibilityStatus: input.eligibilityStatus,
    eligibilityReasons: input.eligibilityReasons,
    status: targetStatus,
  });
}

async function cancelAuthorizedSignaturePayment(
  db: ReturnType<typeof getDb>,
  paymentAttemptId: string | null,
): Promise<void> {
  if (!paymentAttemptId) {
    return;
  }

  const payment = await getPaymentAttemptById(db, paymentAttemptId);
  if (!payment || payment.state !== "authorized" || !payment.stripePaymentIntentId) {
    return;
  }

  await cancelPaymentIntent(payment.stripePaymentIntentId);
  await transitionPaymentState(db, payment.id, "cancelled");
}

async function captureSignedFlowPayment(input: {
  db: ReturnType<typeof getDb>;
  draftId: string;
  signatureSession: SignatureSessionRow;
  request: FastifyRequest;
}): Promise<void> {
  if (!input.signatureSession.paymentAttemptId) {
    return;
  }

  const payment = await getPaymentAttemptById(
    input.db,
    input.signatureSession.paymentAttemptId,
  );
  if (!payment) {
    throw notFoundError("payment");
  }

  if (payment.state === "authorized") {
    if (!payment.stripePaymentIntentId) {
      throw new AppError({
        family: "payment_failure",
        statusCode: 409,
        code: "PAYMENT_AUTHORIZATION_INVALID",
        message: "Authorized signature payment is missing a Stripe PaymentIntent ID.",
        userMessage: "The payment authorization could not be completed.",
        userAction: "Please restart checkout.",
      });
    }

    const capture = await capturePaymentIntent(payment.stripePaymentIntentId);
    await transitionPaymentState(input.db, payment.id, "captured", {
      stripeChargeId: capture.chargeId ?? undefined,
    });
  }

  await syncDraftFulfillmentFromPaymentState(input.db, input.draftId, {
    signatureFlowMode: input.signatureSession.signatureFlowMode,
    paymentState: "captured",
    signatureSessionStatus: "signed_document_attached",
  });
  await enqueueDispatchIfEligible({
    db: input.db,
    draftId: input.draftId,
    paymentId: payment.id,
    log: input.request.log,
    failureMessage: "Failed to enqueue dispatch after signed document capture",
  });
}

async function processSwissSignCallback(input: {
  request: FastifyRequest;
  providerSessionId: string;
  callbackResult: Awaited<
    ReturnType<ReturnType<typeof getSwissSignProvider>["handleSignatureCallback"]>
  >;
}): Promise<SignatureSessionRow | null> {
  const db = getDb();
  const signatureSession = await getSignatureSessionByProviderSessionId(
    db,
    input.providerSessionId,
  );
  if (!signatureSession) {
    return null;
  }

  const inserted = await recordSignatureEvent(db, {
    signatureSessionId: signatureSession.id,
    draftId: signatureSession.draftId,
    eventSource: "webhook",
    eventType: input.callbackResult.status,
    eventKey: input.callbackResult.eventKey,
    payload: input.callbackResult.payload,
    processedAt: new Date(),
  });

  if (!inserted) {
    return getSignatureSessionByProviderSessionId(db, input.providerSessionId);
  }

  if (
    input.callbackResult.status === "failed" ||
    input.callbackResult.status === "expired" ||
    input.callbackResult.status === "cancelled"
  ) {
    await transitionSignatureSessionStatus(
      db,
      signatureSession.id,
      input.callbackResult.status,
      {
        failureReason:
          input.callbackResult.status === "failed"
            ? "SwissSign reported a failed signing attempt."
            : null,
      },
    );
    await cancelAuthorizedSignaturePayment(db, signatureSession.paymentAttemptId);
    return getSignatureSessionByProviderSessionId(db, input.providerSessionId);
  }

  const inProgressStatus =
    input.callbackResult.status === "signature_completed"
      ? "signature_completed"
      : "signature_in_progress";

  const progressedSession = await transitionSignatureSessionStatus(
    db,
    signatureSession.id,
    inProgressStatus,
    {
      completedAt:
        inProgressStatus === "signature_completed"
          ? input.callbackResult.receivedAt
          : null,
    },
  );

  await syncDraftFulfillmentFromSignatureSessionStatus(
    db,
    signatureSession.draftId,
    inProgressStatus,
  );

  if (inProgressStatus !== "signature_completed") {
    return progressedSession;
  }

  if (!input.callbackResult.signedDocumentToken) {
    throw new AppError({
      family: "provider_outage",
      statusCode: 502,
      code: "SIGNED_DOCUMENT_TOKEN_MISSING",
      message: "SwissSign callback completed without a signed document token.",
      userMessage:
        "The signature finished, but the signed document is not available yet.",
      userAction: "Please wait a moment and refresh.",
    });
  }

  const provider = getSwissSignProvider();
  const signedDocument = await provider.fetchSignedDocument({
    providerSessionId: input.providerSessionId,
    signedDocumentToken: input.callbackResult.signedDocumentToken,
  });

  const signedFileAsset = await attachSignedDocumentToSignatureSession(db, {
    signatureSession: progressedSession,
    fileName: signedDocument.fileName,
    mimeType: signedDocument.mimeType,
    bytes: signedDocument.bytes,
  });

  const attachedSession = await transitionSignatureSessionStatus(
    db,
    progressedSession.id,
    "signed_document_attached",
    {
      signedFileAssetId: signedFileAsset.id,
      completedAt: input.callbackResult.receivedAt,
    },
  );

  await syncDraftFulfillmentFromSignatureSessionStatus(
    db,
    signatureSession.draftId,
    "signed_document_attached",
  );
  await captureSignedFlowPayment({
    db,
    draftId: signatureSession.draftId,
    signatureSession: attachedSession,
    request: input.request,
  });

  return attachedSession;
}

export async function signingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/fulfillment",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const response = await buildDraftFulfillmentResponse(
        db,
        request.params.draftId,
        session.id,
      );

      reply.send(response);
    },
  );

  app.post<{ Params: { draftId: string } }>(
    "/drafts/:draftId/signature/eligibility",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const { db, session, draft } = await getScopedDraft(request);
      const provider = getSwissSignProvider();

      const eligibility = await provider.checkEligibility({
        draftId: draft.id,
        signatureFlowMode: draft.signatureFlowMode,
        locale: draft.locale,
      });

      const signatureSession = await getOrCreateEligibilitySession({
        db,
        draftId: draft.id,
        sessionId: session.id,
        signatureFlowMode: draft.signatureFlowMode,
        eligibilityStatus: eligibility.status,
        eligibilityReasons: eligibility.reasons,
      });

      if (eligibility.canContinue) {
        await syncDraftFulfillmentFromSignatureSessionStatus(
          db,
          draft.id,
          "eligibility_confirmed",
        );
      }

      reply.send({
        eligibility,
        signatureSession,
      });
    },
  );

  app.post<{ Params: { draftId: string } }>(
    "/drafts/:draftId/signature/session",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const body = CreateSignatureSessionBody.parse(request.body);
      const { db, session, draft } = await getScopedDraft(request);
      const provider = getSwissSignProvider();
      const snapshot = await getLatestSnapshot(db, draft.id);
      const payment = await getPaymentForDraft(db, draft.id);
      const latestSignatureSession = await getLatestSignatureSession(db, draft.id);

      if (!snapshot?.renderedPdfAssetId) {
        throw new AppError({
          family: "rendering_failure",
          statusCode: 409,
          code: "SIGNED_DOCUMENT_SOURCE_NOT_READY",
          message: "The rendered PDF is not ready for SwissSign handoff.",
          userMessage: "Your final PDF is still being prepared.",
          userAction: "Wait a moment and try again.",
        });
      }

      if (!payment || payment.state !== "authorized") {
        throw new AppError({
          family: "payment_failure",
          statusCode: 409,
          code: "PAYMENT_AUTHORIZATION_REQUIRED",
          message: "SwissSign session creation requires an authorized payment first.",
          userMessage: "Please complete the payment authorization before signing.",
          userAction: "Return to checkout.",
        });
      }

      if (
        !latestSignatureSession ||
        !["eligible", "conditionally_eligible"].includes(
          latestSignatureSession.eligibilityStatus,
        )
      ) {
        throw new AppError({
          family: "policy_refusal",
          statusCode: 409,
          code: "SIGNATURE_ELIGIBILITY_REQUIRED",
          message: "SwissSign session creation requires eligibility confirmation first.",
          userMessage: "Please review the SwissSign requirements first.",
          userAction: "Open the eligibility step and continue from there.",
        });
      }

      if (
        latestSignatureSession.providerSessionId &&
        [
          "signature_session_created",
          "signature_in_progress",
          "identity_stepup_started",
        ].includes(latestSignatureSession.status)
      ) {
        return reply.send({
          signatureSession: latestSignatureSession,
          handoffUrl: latestSignatureSession.handoffUrl,
        });
      }

      const signerDisplayName = await getSignerDisplayName(db, draft);
      const callbackUrl = `${getRequestBaseUrl(request)}/api/v1/webhooks/signatures/swisssign`;
      const workingSession =
        latestSignatureSession.paymentAttemptId ||
        latestSignatureSession.providerSessionId
          ? await createSignatureSession(db, {
              draftId: draft.id,
              sessionId: session.id,
              paymentAttemptId: payment.id,
              signatureFlowMode: draft.signatureFlowMode,
              provider:
                env().SIGNATURE_PROVIDER_MODE === "swisssign"
                  ? "swisssign"
                  : "swisssign_mock",
              eligibilityStatus: latestSignatureSession.eligibilityStatus,
              eligibilityReasons: latestSignatureSession.eligibilityReasons,
              status: "payment_authorized",
            })
          : await transitionSignatureSessionStatus(
              db,
              latestSignatureSession.id,
              "payment_authorized",
              {
                paymentAttemptId: payment.id,
              },
            );

      await syncDraftFulfillmentFromSignatureSessionStatus(
        db,
        draft.id,
        "payment_authorized",
      );

      const providerSession = await provider.createSignatureSession({
        signatureSessionId: workingSession.id,
        draftId: draft.id,
        signatureFlowMode: draft.signatureFlowMode,
        locale: draft.locale,
        returnUrl: body.returnUrl,
        callbackUrl,
        renderedPdfAssetId: snapshot.renderedPdfAssetId,
        renderedPdfFilename: `draft-${draft.id}.pdf`,
        signerDisplayName,
        signerEmail: session.email ?? null,
      });

      const signatureSession = await transitionSignatureSessionStatus(
        db,
        workingSession.id,
        providerSession.status,
        {
          paymentAttemptId: payment.id,
          providerSessionId: providerSession.providerSessionId,
          handoffUrl: providerSession.handoffUrl,
          expiresAt: providerSession.expiresAt,
          metadata: providerSession.metadata ?? null,
        },
      );

      await syncDraftFulfillmentFromSignatureSessionStatus(
        db,
        draft.id,
        providerSession.status,
      );

      reply.send({
        signatureSession,
        handoffUrl: signatureSession.handoffUrl,
      });
    },
  );

  app.post<{ Params: { draftId: string } }>(
    "/drafts/:draftId/signature/oidc/authorize",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const { db, draft } = await getScopedDraft(request);
      const signatureSession = await getLatestSignatureSession(db, draft.id);

      if (!signatureSession) {
        throw notFoundError("signature session");
      }

      const transient = createSwissIdAuthTransientState();
      const discovery = await loadSwissIdDiscovery();
      const authorizeUrl = buildSwissIdAuthorizeUrl({
        discovery,
        state: transient.state,
        nonce: transient.nonce,
        codeVerifier: transient.codeVerifier,
      });

      await transitionSignatureSessionStatus(
        db,
        signatureSession.id,
        "identity_stepup_started",
        {
          oidcState: transient.state,
          oidcNonce: transient.nonce,
          pkceCodeVerifier: transient.codeVerifier,
        },
      );

      await syncDraftFulfillmentFromSignatureSessionStatus(
        db,
        draft.id,
        "identity_stepup_started",
      );

      reply.send({
        authorizeUrl,
      });
    },
  );

  app.get("/signatures/oidc/callback", async (request, reply) => {
    const parsed = parseSwissIdCallbackQuery(request.query as Record<string, unknown>);
    const db = getDb();

    const [signatureSession] = await db
      .select()
      .from(schema.signatureSessions)
      .where(eq(schema.signatureSessions.oidcState, parsed.state))
      .limit(1);

    if (!signatureSession) {
      throw notFoundError("signature session");
    }

    if (parsed.error) {
      await transitionSignatureSessionStatus(db, signatureSession.id, "failed", {
        failureReason: parsed.errorDescription ?? parsed.error,
      });
      return reply.send({
        ok: false,
        state: parsed.state,
        error: parsed.error,
        errorDescription: parsed.errorDescription,
      });
    }

    await transitionSignatureSessionStatus(
      db,
      signatureSession.id,
      "signature_session_created",
      {
        metadata: {
          ...(typeof signatureSession.metadata === "object" && signatureSession.metadata
            ? (signatureSession.metadata as Record<string, unknown>)
            : {}),
          swissIdCodeReceived: Boolean(parsed.code),
        },
      },
    );

    reply.send({
      ok: true,
      state: parsed.state,
      codeReceived: Boolean(parsed.code),
    });
  });

  app.post<{ Params: { draftId: string; providerSessionId: string } }>(
    "/drafts/:draftId/signature/mock/:providerSessionId/callback",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const body = MockSignatureCallbackBody.parse(request.body);
      const { draft } = await getScopedDraft(
        request as FastifyRequest<{ Params: { draftId: string } }>,
      );

      const provider = getSwissSignProvider();
      const callbackResult = await provider.handleSignatureCallback({
        headers: {},
        payload: {
          providerSessionId: request.params.providerSessionId,
          status: body.outcome,
          draftId: draft.id,
        },
        rawBody: JSON.stringify({
          providerSessionId: request.params.providerSessionId,
          status: body.outcome,
          draftId: draft.id,
        }),
      });

      const signatureSession = await processSwissSignCallback({
        request,
        providerSessionId: request.params.providerSessionId,
        callbackResult,
      });

      reply.send({
        ok: true,
        signatureSession,
      });
    },
  );

  app.post(
    "/webhooks/signatures/swisssign",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = getSwissSignProvider();
      const callbackResult = await provider.handleSignatureCallback({
        headers: request.headers,
        payload: request.body,
        rawBody: JSON.stringify(request.body ?? {}),
      });

      const signatureSession = await processSwissSignCallback({
        request,
        providerSessionId: callbackResult.providerSessionId,
        callbackResult,
      });

      reply.status(200).send({
        received: true,
        signatureSessionId: signatureSession?.id ?? null,
      });
    },
  );
}
