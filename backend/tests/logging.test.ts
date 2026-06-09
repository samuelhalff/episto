import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/shared/logging/index.js";

describe("createLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts credential-bearing request headers", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    const logger = createLogger("logger-test");
    logger.info(
      {
        req: {
          headers: {
            authorization: "Bearer super-secret-token",
            cookie: "__Host-session=super-secret-session",
            "x-requested-with": "XMLHttpRequest",
          },
        },
      },
      "request received",
    );

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    const output = writes.join("");
    expect(output).not.toContain("super-secret-token");
    expect(output).not.toContain("super-secret-session");
    expect(output).toContain("[Redacted]");
    expect(output).toContain("XMLHttpRequest");
  });
});
