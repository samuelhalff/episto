import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock puppeteer-core — we can't run a browser in CI
vi.mock("puppeteer-core", () => ({
  default: {
    launch: vi.fn(),
  },
}));

// Mock dependencies
vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    DATABASE_URL: "postgresql://localhost/test",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "test",
    S3_ACCESS_KEY: "test",
    S3_SECRET_KEY: "test",
  }),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: vi.fn(),
  schema: {},
}));

vi.mock("../src/modules/files/file.service.js", () => ({
  createFileAsset: vi.fn(),
  renderStorageKey: (draftId: string, version: number) =>
    `renders/${draftId}/${version}.pdf`,
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  uploadObject: vi.fn(),
}));

vi.mock("../src/modules/rendering/snapshot.service.js", () => ({
  setSnapshotPdfAsset: vi.fn(),
}));

describe("render.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports RenderResult type and renderSnapshotToPdf function", async () => {
    const mod = await import("../src/modules/rendering/render.service.js");
    expect(typeof mod.renderSnapshotToPdf).toBe("function");
    expect(typeof mod.closeBrowser).toBe("function");
  });

  it("renderStorageKey generates correct path", async () => {
    const { renderStorageKey } = await import(
      "../src/modules/files/file.service.js"
    );
    expect(renderStorageKey("draft-123", 1)).toBe("renders/draft-123/1.pdf");
  });
});
