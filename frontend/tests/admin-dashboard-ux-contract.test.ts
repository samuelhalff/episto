import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const adminApiSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/admin-api.ts"),
  "utf8",
);
const adminShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/admin-shell.tsx"),
  "utf8",
);
const overviewPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/overview/page.tsx"),
  "utf8",
);
const pulseDashboardSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/dashboard/page.tsx"),
  "utf8",
);
const adminPanelsSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/admin-panels.tsx"),
  "utf8",
);
const adminTopBarPath = path.join(
  repoRoot,
  "frontend/src/app/[locale]/admin/admin-top-bar.tsx",
);
const adminTopBarSource = existsSync(adminTopBarPath)
  ? readFileSync(adminTopBarPath, "utf8")
  : "";
const accountPagePath = path.join(
  repoRoot,
  "frontend/src/app/[locale]/admin/account/page.tsx",
);
const accountPageSource = existsSync(accountPagePath)
  ? readFileSync(accountPagePath, "utf8")
  : "";

const localeMessagePaths = {
  "de-CH": path.join(repoRoot, "frontend/src/messages/de-CH.json"),
  "en-CH": path.join(repoRoot, "frontend/src/messages/en-CH.json"),
  "fr-CH": path.join(repoRoot, "frontend/src/messages/fr-CH.json"),
  "it-CH": path.join(repoRoot, "frontend/src/messages/it-CH.json"),
} as const;

type LocaleKey = keyof typeof localeMessagePaths;
type MessageTree = Record<string, unknown>;

const requiredAdminKeys = [
  "admin.shell.search",
  "admin.shell.account",
  "admin.shell.role",
  "admin.overview.title",
  "admin.overview.quickActions.title",
  "admin.overview.quickActions.search",
  "admin.overview.quickActions.flags",
  "admin.overview.quickActions.sessions",
  "admin.overview.quickActions.retention",
  "admin.overview.priority.ambiguousInfo",
  "admin.overview.priority.suspiciousInfo",
  "admin.overview.signals.recentRefundsInfo",
  "admin.overview.retention.expiredSessionsInfo",
  "admin.overview.retention.expiredContentInfo",
  "admin.overview.retention.expiredPdfsInfo",
  "admin.account.title",
  "admin.account.description",
  "admin.account.identity",
  "admin.account.authMethod",
  "admin.overview.retention.title",
] as const;

function readJsonFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as MessageTree;
}

function getNestedValue(source: unknown, keyPath: string) {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as MessageTree)[segment];
  }, source);
}

describe("admin dashboard ux contract", () => {
  it("shows the product funnel and distinguishes tracked events from GA4", () => {
    expect(pulseDashboardSource).toContain('label="Tracked visits"');
    expect(pulseDashboardSource).toContain('label="Drafts started"');
    expect(pulseDashboardSource).toContain('title="Product funnel"');
    expect(pulseDashboardSource).toContain('title="GA4 traffic"');
    expect(pulseDashboardSource).toContain('title="Search Console"');
    expect(pulseDashboardSource).toContain('title="Google Ads"');
    expect(pulseDashboardSource).not.toContain(
      "Traffic and sessions from Google Analytics 4 will appear here once the read-only GA4 connection is wired.",
    );
  });

  it("adds a dedicated operator overview fetcher for the dashboard", () => {
    expect(adminApiSource).toContain("export async function fetchAdminOverview()");
    expect(adminApiSource).toContain(
      'return adminFetch<OverviewResponse>("/admin/overview")',
    );
  });

  it("adds a route-aware top bar with account access to the authenticated admin shell", () => {
    expect(existsSync(adminTopBarPath)).toBe(true);
    expect(adminTopBarSource).toContain('getAdminPagePath(pathname, "account")');
    expect(adminTopBarSource).toContain('getAdminPagePath(pathname, "search")');
    expect(adminShellSource).toContain('import { AdminTopBar } from "./admin-top-bar"');
    expect(adminShellSource).toContain("<AdminTopBar");
  });

  it("rebuilds the overview page around operator queues and quick actions", () => {
    expect(overviewPageSource).toContain("queryKeys.admin.overview()");
    expect(overviewPageSource).toContain("fetchAdminOverview");
    expect(overviewPageSource).toContain("queryKeys.admin.retention()");
    expect(overviewPageSource).toContain("fetchAdminRetention");
    expect(overviewPageSource).toContain('getAdminPagePath(pathname, "search")');
    expect(overviewPageSource).toContain('getAdminPagePath(pathname, "flags")');
    expect(overviewPageSource).toContain('getAdminPagePath(pathname, "sessions")');
    expect(overviewPageSource).toContain('getAdminPagePath(pathname, "retention")');
    expect(overviewPageSource).toContain('sub: t("overview.priority.ambiguousInfo")');
    expect(overviewPageSource).toContain('sub: t("overview.priority.suspiciousInfo")');
    expect(overviewPageSource).toContain('sub: t("overview.signals.recentRefundsInfo")');
    expect(overviewPageSource).toContain(
      'sub: t("overview.retention.expiredSessionsInfo")',
    );
    expect(overviewPageSource).toContain(
      'sub: t("overview.retention.expiredContentInfo")',
    );
    expect(overviewPageSource).toContain('sub: t("overview.retention.expiredPdfsInfo")');
    expect(overviewPageSource).not.toContain("fetchAdminSummary");
    expect(overviewPageSource).not.toContain("fetchAdminLocale");
    expect(overviewPageSource).not.toContain("fetchAdminAi");
  });

  it("keeps legacy dashboard cards on app theme tokens instead of hardcoded light card colors", () => {
    expect(adminPanelsSource).toContain("var(--app-surface-strong)");
    expect(adminPanelsSource).toContain("var(--app-surface-muted)");
    expect(adminPanelsSource).toContain("var(--app-fg)");
    expect(adminPanelsSource).toContain("var(--app-muted)");
    expect(adminPanelsSource).not.toContain("bg-white");
    expect(adminPanelsSource).not.toContain("text-zinc-950");
  });

  it("adds an account page that reads the authenticated admin profile", () => {
    expect(existsSync(accountPagePath)).toBe(true);
    expect(accountPageSource).toContain("useAdminAuth");
    expect(accountPageSource).toContain('useTranslations("admin")');
    expect(accountPageSource).toContain("admin?.email");
    expect(accountPageSource).toContain("authMethod");
  });

  it("ships the new admin copy in every supported locale", () => {
    for (const locale of Object.keys(localeMessagePaths) as LocaleKey[]) {
      const messages = readJsonFile(localeMessagePaths[locale]);

      for (const keyPath of requiredAdminKeys) {
        expect(
          getNestedValue(messages, keyPath),
          `${locale} is missing ${keyPath}`,
        ).toBeTypeOf("string");
      }
    }
  });
});
