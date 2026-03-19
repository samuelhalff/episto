import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  emitDraftEvent,
  subscribeDraft,
  unsubscribeDraft,
} from "../src/modules/drafting/draft-events.js";
import type {
  DraftEventHandler,
  AiTokenPayload,
  AiMessageCompletePayload,
  FieldUpdatePayload,
  StreamErrorPayload,
} from "../src/modules/drafting/draft-events.js";

describe("draft event bus", () => {
  const draftId = "test-draft-123";
  let handler: DraftEventHandler;

  beforeEach(() => {
    handler = vi.fn();
  });

  afterEach(() => {
    unsubscribeDraft(draftId, handler);
  });

  it("delivers ai_token events to subscribers", () => {
    subscribeDraft(draftId, handler);

    const payload: AiTokenPayload = { token: "Hello", messageId: "msg-1" };
    emitDraftEvent(draftId, "ai_token", payload);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith("ai_token", payload);
  });

  it("delivers ai_message_complete events", () => {
    subscribeDraft(draftId, handler);

    const payload: AiMessageCompletePayload = {
      messageId: "msg-1",
      fullContent: "Full letter body",
      extractedFields: { body: "Full letter body" },
    };
    emitDraftEvent(draftId, "ai_message_complete", payload);

    expect(handler).toHaveBeenCalledWith("ai_message_complete", payload);
  });

  it("delivers field_update events", () => {
    subscribeDraft(draftId, handler);

    const payload: FieldUpdatePayload = {
      field: "subject",
      value: "Kündigung",
      updatedAt: new Date().toISOString(),
    };
    emitDraftEvent(draftId, "field_update", payload);

    expect(handler).toHaveBeenCalledWith("field_update", payload);
  });

  it("delivers error events", () => {
    subscribeDraft(draftId, handler);

    const payload: StreamErrorPayload = {
      code: "AI_TIMEOUT",
      message: "Service timed out",
    };
    emitDraftEvent(draftId, "error", payload);

    expect(handler).toHaveBeenCalledWith("error", payload);
  });

  it("does not deliver events for other drafts", () => {
    subscribeDraft(draftId, handler);

    emitDraftEvent("other-draft", "ai_token", {
      token: "X",
      messageId: "msg-2",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("stops delivery after unsubscribe", () => {
    subscribeDraft(draftId, handler);
    unsubscribeDraft(draftId, handler);

    emitDraftEvent(draftId, "ai_token", {
      token: "X",
      messageId: "msg-3",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("supports multiple subscribers on the same draft", () => {
    const handler2 = vi.fn();
    subscribeDraft(draftId, handler);
    subscribeDraft(draftId, handler2);

    const payload: AiTokenPayload = { token: "Hi", messageId: "msg-4" };
    emitDraftEvent(draftId, "ai_token", payload);

    expect(handler).toHaveBeenCalledWith("ai_token", payload);
    expect(handler2).toHaveBeenCalledWith("ai_token", payload);

    unsubscribeDraft(draftId, handler2);
  });

  it("delivers multiple sequential events in order", () => {
    const events: Array<[string, unknown]> = [];
    const orderHandler: DraftEventHandler = (event, payload) => {
      events.push([event, payload]);
    };
    subscribeDraft(draftId, orderHandler);

    emitDraftEvent(draftId, "ai_token", { token: "A", messageId: "m1" });
    emitDraftEvent(draftId, "ai_token", { token: "B", messageId: "m1" });
    emitDraftEvent(draftId, "ai_message_complete", {
      messageId: "m1",
      fullContent: "AB",
    });

    expect(events).toHaveLength(3);
    expect(events[0]![0]).toBe("ai_token");
    expect(events[1]![0]).toBe("ai_token");
    expect(events[2]![0]).toBe("ai_message_complete");

    unsubscribeDraft(draftId, orderHandler);
  });
});
