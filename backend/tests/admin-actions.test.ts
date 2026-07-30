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

  it("allows manual checks for provider-backed and discoverable ambiguous dispatches", () => {
    expect(canManuallyReconcileDispatch("submitted")).toBe(true);
    expect(canManuallyReconcileDispatch("unknown")).toBe(true);
    expect(canManuallyReconcileDispatch("rejected")).toBe(true);
    expect(canManuallyReconcileDispatch("accepted")).toBe(false);
  });
});
