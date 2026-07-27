import type { z } from "zod";
import { UpdateDraftInput } from "./contracts/index.ts";
import { DraftWorkspacePatchSchema } from "./workspace-draft.ts";

/**
 * The wire body of `PATCH /v1/drafts/:draftId`.
 *
 * Composed in its own leaf module rather than in `contracts`: `workspace-draft`
 * already imports `RecipientCompanySearchResult` from `contracts`, so importing
 * the patch schema back into `contracts` would close the cycle and leave the
 * zod schemas in a temporal dead zone at module evaluation.
 *
 * There is no `metadata` field on purpose. Clients send the workspace delta and
 * the server applies it to the row it has locked; a client that merged into its
 * own snapshot and sent the whole object would erase every write made since
 * that snapshot was rendered.
 */
export const PatchDraftInput = UpdateDraftInput.extend({
  workspacePatch: DraftWorkspacePatchSchema.optional(),
});

export type PatchDraftInputType = z.infer<typeof PatchDraftInput>;
