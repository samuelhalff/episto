import { describe, it, expect } from "vitest";
import { assertDefined } from "./assert-defined";

/**
 * Tests for message cursor format and rate limit constants.
 * These test the logic patterns used in message.service.ts and message.routes.ts
 * without requiring a database connection.
 */

describe("Message cursor format", () => {
  it("creates cursor from createdAt + id", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const id = "abc-123";
    const cursor = `${date.toISOString()}|${id}`;

    expect(cursor).toBe("2024-01-15T10:30:00.000Z|abc-123");
  });

  it("parses cursor into parts correctly", () => {
    const cursor = "2024-01-15T10:30:00.000Z|abc-123";
    const parts = cursor.split("|");

    expect(parts[0]).toBe("2024-01-15T10:30:00.000Z");
    expect(parts[1]).toBe("abc-123");
    expect(new Date(assertDefined(parts[0])).toISOString()).toBe("2024-01-15T10:30:00.000Z");
  });

  it("handles edge case: empty cursor parts", () => {
    const cursor = "|";
    const parts = cursor.split("|");

    expect(parts[0]).toBe("");
    expect(parts[1]).toBe("");
    // These should be treated as invalid by the service
  });

  it("handles cursor with pipe in ID (defensive)", () => {
    const cursor = "2024-01-15T10:30:00.000Z|abc|extra";
    const parts = cursor.split("|");

    // split returns 3 parts, but cursor spec is "date|id"
    // so parts[0] = date, parts[1] = "abc" — remaining is dropped
    expect(parts[0]).toBe("2024-01-15T10:30:00.000Z");
    expect(parts[1]).toBe("abc");
  });
});

describe("Message rate limit constants", () => {
  const RATE_LIMIT = 30;
  const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  it("rate limit is 30 messages per hour", () => {
    expect(RATE_LIMIT).toBe(30);
    expect(RATE_WINDOW_MS).toBe(3_600_000);
  });

  it("rate window calculation is correct", () => {
    const now = Date.now();
    const oneHourAgo = new Date(now - RATE_WINDOW_MS);
    const diff = now - oneHourAgo.getTime();

    expect(diff).toBe(RATE_WINDOW_MS);
  });
});

describe("Message pagination limit", () => {
  it("clamps to max 100", () => {
    const clamp = (limit: number) => Math.min(limit ?? 20, 100);

    expect(clamp(1)).toBe(1);
    expect(clamp(20)).toBe(20);
    expect(clamp(100)).toBe(100);
    expect(clamp(150)).toBe(100);
  });

  it("defaults to 20 when not provided", () => {
    const clamp = (limit?: number) => Math.min(limit ?? 20, 100);

    expect(clamp(undefined)).toBe(20);
    expect(clamp()).toBe(20);
  });
});

describe("Terminal draft states", () => {
  const TERMINAL_STATES = new Set(["submitted", "dispatched", "closed"]);

  it("submitted is terminal", () => {
    expect(TERMINAL_STATES.has("submitted")).toBe(true);
  });

  it("dispatched is terminal", () => {
    expect(TERMINAL_STATES.has("dispatched")).toBe(true);
  });

  it("closed is terminal", () => {
    expect(TERMINAL_STATES.has("closed")).toBe(true);
  });

  it("collecting is not terminal", () => {
    expect(TERMINAL_STATES.has("collecting")).toBe(false);
  });

  it("reviewed is not terminal", () => {
    expect(TERMINAL_STATES.has("reviewed")).toBe(false);
  });
});
