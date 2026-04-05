import { describe, it, expect, vi } from "vitest";
import { CompositeSink } from "../src/modules/analytics/composite-sink.js";
import type { AnalyticsSink, AnalyticsEvent } from "../src/modules/analytics/index.js";

describe("CompositeSink", () => {
  const event: AnalyticsEvent = {
    event: "session_created",
    sessionId: "s-1",
    locale: "de-CH",
  };

  it("fans out to all sinks", () => {
    const s1 = { record: vi.fn() };
    const s2 = { record: vi.fn() };
    const composite = new CompositeSink([s1, s2]);
    composite.record(event);
    expect(s1.record).toHaveBeenCalledWith(event);
    expect(s2.record).toHaveBeenCalledWith(event);
  });

  it("isolates errors — one sink failure does not block others", () => {
    const s1: AnalyticsSink = { record: () => { throw new Error("boom"); } };
    const s2 = { record: vi.fn() };
    const composite = new CompositeSink([s1, s2]);
    composite.record(event);
    expect(s2.record).toHaveBeenCalledWith(event);
  });

  it("works with zero sinks", () => {
    const composite = new CompositeSink([]);
    expect(() => composite.record(event)).not.toThrow();
  });
});
