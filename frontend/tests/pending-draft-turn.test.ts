import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearPendingDraftTurn,
  primePendingDraftTurn,
  readPendingDraftTurn,
} from "../src/lib/pending-draft-turn";

class StorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe("pending draft turn handoff", () => {
  const previousSessionStorage = globalThis.sessionStorage;

  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: new StorageMock(),
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: previousSessionStorage,
    });
  });

  it("stores and clears assistant-pending state per draft", () => {
    primePendingDraftTurn({ draftId: "draft-1", messageId: "msg-1" });

    expect(readPendingDraftTurn("draft-1")).toEqual({
      draftId: "draft-1",
      messageId: "msg-1",
    });

    clearPendingDraftTurn("draft-1");

    expect(readPendingDraftTurn("draft-1")).toBeNull();
  });
});
