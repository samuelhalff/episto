/**
 * drizzle-zod bridge — generates Zod schemas from Drizzle table definitions.
 * Use these for backend DB-layer validation (insert/select).
 * API-level validation uses the shared Zod contracts in @swiss-mail/shared.
 */

import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import {
  sessions,
  draftLetters,
  senderProfiles,
  recipientProfiles,
  fileAssets,
  draftSnapshots,
  conversationMessages,
  paymentAttempts,
  dispatchAttempts,
  dispatchStatusEvents,
  supportEvents,
  providerRateMatrixVersions,
  providerRateMatrixEntries,
  draftQuoteCache,
} from "./schema.js";

// ---------------------------------------------------------------------------
// Insert schemas — validate data before DB writes
// ---------------------------------------------------------------------------

export const insertSessionSchema = createInsertSchema(sessions);
export const insertDraftLetterSchema = createInsertSchema(draftLetters);
export const insertSenderProfileSchema = createInsertSchema(senderProfiles);
export const insertRecipientProfileSchema =
  createInsertSchema(recipientProfiles);
export const insertFileAssetSchema = createInsertSchema(fileAssets);
export const insertDraftSnapshotSchema = createInsertSchema(draftSnapshots);
export const insertConversationMessageSchema =
  createInsertSchema(conversationMessages);
export const insertPaymentAttemptSchema = createInsertSchema(paymentAttempts);
export const insertDispatchAttemptSchema = createInsertSchema(dispatchAttempts);
export const insertDispatchStatusEventSchema =
  createInsertSchema(dispatchStatusEvents);
export const insertSupportEventSchema = createInsertSchema(supportEvents);
export const insertProviderRateMatrixVersionSchema = createInsertSchema(providerRateMatrixVersions);
export const insertProviderRateMatrixEntrySchema = createInsertSchema(providerRateMatrixEntries);
export const insertDraftQuoteCacheSchema = createInsertSchema(draftQuoteCache);

// ---------------------------------------------------------------------------
// Select schemas — validate data read from DB
// ---------------------------------------------------------------------------

export const selectSessionSchema = createSelectSchema(sessions);
export const selectDraftLetterSchema = createSelectSchema(draftLetters);
export const selectSenderProfileSchema = createSelectSchema(senderProfiles);
export const selectRecipientProfileSchema =
  createSelectSchema(recipientProfiles);
export const selectFileAssetSchema = createSelectSchema(fileAssets);
export const selectDraftSnapshotSchema = createSelectSchema(draftSnapshots);
export const selectConversationMessageSchema =
  createSelectSchema(conversationMessages);
export const selectPaymentAttemptSchema = createSelectSchema(paymentAttempts);
export const selectDispatchAttemptSchema = createSelectSchema(dispatchAttempts);
export const selectDispatchStatusEventSchema =
  createSelectSchema(dispatchStatusEvents);
export const selectSupportEventSchema = createSelectSchema(supportEvents);
export const selectProviderRateMatrixVersionSchema = createSelectSchema(providerRateMatrixVersions);
export const selectProviderRateMatrixEntrySchema = createSelectSchema(providerRateMatrixEntries);
export const selectDraftQuoteCacheSchema = createSelectSchema(draftQuoteCache);

// ---------------------------------------------------------------------------
// Type helpers — infer types from insert/select schemas
// ---------------------------------------------------------------------------

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type SelectSession = z.infer<typeof selectSessionSchema>;
export type InsertDraftLetter = z.infer<typeof insertDraftLetterSchema>;
export type SelectDraftLetter = z.infer<typeof selectDraftLetterSchema>;
export type InsertSenderProfile = z.infer<typeof insertSenderProfileSchema>;
export type SelectSenderProfile = z.infer<typeof selectSenderProfileSchema>;
export type InsertRecipientProfile = z.infer<
  typeof insertRecipientProfileSchema
>;
export type SelectRecipientProfile = z.infer<
  typeof selectRecipientProfileSchema
>;
export type InsertFileAsset = z.infer<typeof insertFileAssetSchema>;
export type SelectFileAsset = z.infer<typeof selectFileAssetSchema>;
export type InsertDraftSnapshot = z.infer<typeof insertDraftSnapshotSchema>;
export type SelectDraftSnapshot = z.infer<typeof selectDraftSnapshotSchema>;
export type InsertPaymentAttempt = z.infer<typeof insertPaymentAttemptSchema>;
export type SelectPaymentAttempt = z.infer<typeof selectPaymentAttemptSchema>;
export type InsertDispatchAttempt = z.infer<typeof insertDispatchAttemptSchema>;
export type SelectDispatchAttempt = z.infer<
  typeof selectDispatchAttemptSchema
>;
export type InsertProviderRateMatrixVersion = z.infer<typeof insertProviderRateMatrixVersionSchema>;
export type SelectProviderRateMatrixVersion = z.infer<typeof selectProviderRateMatrixVersionSchema>;
export type InsertProviderRateMatrixEntry = z.infer<typeof insertProviderRateMatrixEntrySchema>;
export type SelectProviderRateMatrixEntry = z.infer<typeof selectProviderRateMatrixEntrySchema>;
export type InsertDraftQuoteCache = z.infer<typeof insertDraftQuoteCacheSchema>;
export type SelectDraftQuoteCache = z.infer<typeof selectDraftQuoteCacheSchema>;
