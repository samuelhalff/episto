import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
  getJobCounts: vi.fn(),
  env: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({
    execute: mocks.execute,
    select: mocks.select,
  }),
  schema: {
    dispatchAttempts: {
      paymentAttemptId: "payment_attempt_id",
      trackingNumber: "tracking_number",
    },
  },
}));

vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({
    getJobCounts: mocks.getJobCounts,
  }),
  QUEUE_NAMES: {
    SEND_EMAIL: "send-email",
  },
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: mocks.env,
}));

vi.mock("drizzle-orm", () => ({
  sql: vi.fn().mockReturnValue("SELECT 1"),
}));

import { healthRoutes } from "../src/routes/health.js";

function makeReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  return reply;
}

function makeSelectChain(result: unknown[] | Promise<unknown[]>) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(result);
  return chain;
}

describe("health routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.execute.mockResolvedValue([{ "?column?": 1 }]);
    mocks.select.mockReturnValue(makeSelectChain(Promise.resolve([])));
    mocks.getJobCounts.mockResolvedValue({ waiting: 0 });
    mocks.env.mockReturnValue({
      NODE_ENV: "development",
      EMAIL_FROM: "dev@example.com",
      SUPPORT_EMAIL: "support@example.com",
    });
  });

  it("reports readiness ok when database, schema, and redis checks pass", async () => {
    let readinessHandler:
      | ((req: unknown, reply: ReturnType<typeof makeReply>) => Promise<void>)
      | undefined;
    const app = {
      get: vi.fn((url: string, handler: typeof readinessHandler) => {
        if (url === "/readiness") {
          readinessHandler = handler;
        }
      }),
    };

    await healthRoutes(app as never);

    const reply = makeReply();
    await readinessHandler?.({}, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        checks: {
          database: "ok",
          schema: "ok",
          redis: "ok",
          email: "ok",
        },
      }),
    );
  });

  it("fails readiness when the schema compatibility check fails", async () => {
    let readinessHandler:
      | ((req: unknown, reply: ReturnType<typeof makeReply>) => Promise<void>)
      | undefined;
    const app = {
      get: vi.fn((url: string, handler: typeof readinessHandler) => {
        if (url === "/readiness") {
          readinessHandler = handler;
        }
      }),
    };
    mocks.select.mockReturnValue(
      makeSelectChain(
        Promise.reject(new Error('column "tracking_number" does not exist')),
      ),
    );

    await healthRoutes(app as never);

    const reply = makeReply();
    await readinessHandler?.({}, reply);

    expect(reply.status).toHaveBeenCalledWith(503);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "degraded",
        checks: {
          database: "ok",
          schema: "fail",
          redis: "ok",
          email: "ok",
        },
      }),
    );
  });

  it("surfaces invalid development email sender configuration without failing readiness", async () => {
    let readinessHandler:
      | ((req: unknown, reply: ReturnType<typeof makeReply>) => Promise<void>)
      | undefined;
    const app = {
      get: vi.fn((url: string, handler: typeof readinessHandler) => {
        if (url === "/readiness") {
          readinessHandler = handler;
        }
      }),
    };
    mocks.env.mockReturnValue({
      NODE_ENV: "development",
      EMAIL_FROM: "noreply@swissmail.ch",
      SUPPORT_EMAIL: "support@swissmail.ch",
    });

    await healthRoutes(app as never);

    const reply = makeReply();
    await readinessHandler?.({}, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        checks: {
          database: "ok",
          schema: "ok",
          redis: "ok",
          email: "fail",
        },
      }),
    );
  });

  it("treats the swissmail.ch sender domain as ready in production", async () => {
    let readinessHandler:
      | ((req: unknown, reply: ReturnType<typeof makeReply>) => Promise<void>)
      | undefined;
    const app = {
      get: vi.fn((url: string, handler: typeof readinessHandler) => {
        if (url === "/readiness") {
          readinessHandler = handler;
        }
      }),
    };
    mocks.env.mockReturnValue({
      NODE_ENV: "production",
      EMAIL_FROM: "noreply@swissmail.ch",
      SUPPORT_EMAIL: "support@swissmail.ch",
    });

    await healthRoutes(app as never);

    const reply = makeReply();
    await readinessHandler?.({}, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        checks: {
          database: "ok",
          schema: "ok",
          redis: "ok",
          email: "ok",
        },
      }),
    );
  });
});
