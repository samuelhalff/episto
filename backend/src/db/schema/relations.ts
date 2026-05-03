import { relations } from "drizzle-orm";
import { productEvents, supportEvents } from "./analytics.js";
import { sessions } from "./auth.js";
import { dispatchAttempts, dispatchStatusEvents } from "./dispatch.js";
import {
  conversationMessages,
  draftLetters,
  recipientProfiles,
  senderProfiles,
} from "./drafting.js";
import { draftSnapshots, fileAssets } from "./files.js";
import { paymentAttempts } from "./payments.js";
import { signatureEvents, signatureSessions } from "./signatures.js";

export const sessionsRelations = relations(sessions, ({ many }) => ({
  drafts: many(draftLetters),
  senderProfiles: many(senderProfiles),
  recipientProfiles: many(recipientProfiles),
  fileAssets: many(fileAssets),
  paymentAttempts: many(paymentAttempts),
  signatureSessions: many(signatureSessions),
  supportEvents: many(supportEvents),
  productEvents: many(productEvents),
}));

export const draftLettersRelations = relations(draftLetters, ({ one, many }) => ({
  session: one(sessions, {
    fields: [draftLetters.sessionId],
    references: [sessions.id],
  }),
  senderProfile: one(senderProfiles, {
    fields: [draftLetters.senderProfileId],
    references: [senderProfiles.id],
  }),
  recipientProfile: one(recipientProfiles, {
    fields: [draftLetters.recipientProfileId],
    references: [recipientProfiles.id],
  }),
  signatureAsset: one(fileAssets, {
    fields: [draftLetters.signatureAssetId],
    references: [fileAssets.id],
  }),
  snapshots: many(draftSnapshots),
  messages: many(conversationMessages),
  fileAssets: many(fileAssets),
  paymentAttempts: many(paymentAttempts),
  dispatchAttempts: many(dispatchAttempts),
  signatureSessions: many(signatureSessions),
  signatureEvents: many(signatureEvents),
  supportEvents: many(supportEvents),
}));

export const senderProfilesRelations = relations(senderProfiles, ({ one }) => ({
  session: one(sessions, {
    fields: [senderProfiles.sessionId],
    references: [sessions.id],
  }),
}));

export const recipientProfilesRelations = relations(recipientProfiles, ({ one }) => ({
  session: one(sessions, {
    fields: [recipientProfiles.sessionId],
    references: [sessions.id],
  }),
}));

export const fileAssetsRelations = relations(fileAssets, ({ one }) => ({
  session: one(sessions, {
    fields: [fileAssets.sessionId],
    references: [sessions.id],
  }),
  draft: one(draftLetters, {
    fields: [fileAssets.draftId],
    references: [draftLetters.id],
  }),
}));

export const draftSnapshotsRelations = relations(draftSnapshots, ({ one, many }) => ({
  draft: one(draftLetters, {
    fields: [draftSnapshots.draftId],
    references: [draftLetters.id],
  }),
  renderedPdfAsset: one(fileAssets, {
    fields: [draftSnapshots.renderedPdfAssetId],
    references: [fileAssets.id],
  }),
  dispatchAttempts: many(dispatchAttempts),
}));

export const conversationMessagesRelations = relations(
  conversationMessages,
  ({ one }) => ({
    draft: one(draftLetters, {
      fields: [conversationMessages.draftId],
      references: [draftLetters.id],
    }),
  }),
);

export const paymentAttemptsRelations = relations(paymentAttempts, ({ one }) => ({
  draft: one(draftLetters, {
    fields: [paymentAttempts.draftId],
    references: [draftLetters.id],
  }),
  session: one(sessions, {
    fields: [paymentAttempts.sessionId],
    references: [sessions.id],
  }),
}));

export const signatureSessionsRelations = relations(
  signatureSessions,
  ({ one, many }) => ({
    draft: one(draftLetters, {
      fields: [signatureSessions.draftId],
      references: [draftLetters.id],
    }),
    session: one(sessions, {
      fields: [signatureSessions.sessionId],
      references: [sessions.id],
    }),
    paymentAttempt: one(paymentAttempts, {
      fields: [signatureSessions.paymentAttemptId],
      references: [paymentAttempts.id],
    }),
    signedFileAsset: one(fileAssets, {
      fields: [signatureSessions.signedFileAssetId],
      references: [fileAssets.id],
    }),
    events: many(signatureEvents),
  }),
);

export const signatureEventsRelations = relations(signatureEvents, ({ one }) => ({
  draft: one(draftLetters, {
    fields: [signatureEvents.draftId],
    references: [draftLetters.id],
  }),
  signatureSession: one(signatureSessions, {
    fields: [signatureEvents.signatureSessionId],
    references: [signatureSessions.id],
  }),
}));

export const dispatchAttemptsRelations = relations(dispatchAttempts, ({ one, many }) => ({
  draft: one(draftLetters, {
    fields: [dispatchAttempts.draftId],
    references: [draftLetters.id],
  }),
  snapshot: one(draftSnapshots, {
    fields: [dispatchAttempts.snapshotId],
    references: [draftSnapshots.id],
  }),
  paymentAttempt: one(paymentAttempts, {
    fields: [dispatchAttempts.paymentAttemptId],
    references: [paymentAttempts.id],
  }),
  statusEvents: many(dispatchStatusEvents),
}));

export const dispatchStatusEventsRelations = relations(
  dispatchStatusEvents,
  ({ one }) => ({
    dispatchAttempt: one(dispatchAttempts, {
      fields: [dispatchStatusEvents.dispatchAttemptId],
      references: [dispatchAttempts.id],
    }),
  }),
);

export const supportEventsRelations = relations(supportEvents, ({ one }) => ({
  session: one(sessions, {
    fields: [supportEvents.sessionId],
    references: [sessions.id],
  }),
  draft: one(draftLetters, {
    fields: [supportEvents.draftId],
    references: [draftLetters.id],
  }),
}));

export const productEventsRelations = relations(productEvents, ({ one }) => ({
  session: one(sessions, {
    fields: [productEvents.sessionId],
    references: [sessions.id],
  }),
}));
