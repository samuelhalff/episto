import { describe, expect, it } from "vitest";

import {
  canManuallyReconcileDispatch,
  getAdminSearchResultTarget,
} from "../src/modules/admin/admin-actions.routes.js";

describe("admin actions helpers", () => {
  it("routes draft-backed search results to the draft case", () => {
    expect(
      getAdminSearchResultTarget({
        kind: "dispatch_attempt",
        id: "dispatch-1",
        draftId: "draft-1",
        sessionId: null,
      }),
    ).toEqual({
      draftId: "draft-1",
      sessionId: null,
    });
  });

  it("routes session results to the session detail view", () => {
    expect(
      getAdminSearchResultTarget({
        kind: "session",
        id: "session-1",
        draftId: null,
        sessionId: null,
      }),
    ).toEqual({
      draftId: null,
      sessionId: "session-1",
    });
  });

  it("allows manual reconciliation only for ambiguous provider-backed dispatches", () => {
    expect(canManuallyReconcileDispatch("submitted", "provider-1")).toBe(true);
    expect(canManuallyReconcileDispatch("unknown", "provider-1")).toBe(true);
    expect(canManuallyReconcileDispatch("accepted", "provider-1")).toBe(false);
    expect(canManuallyReconcileDispatch("submitted", null)).toBe(false);
  });
});
