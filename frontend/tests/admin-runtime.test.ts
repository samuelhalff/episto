import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { i18nState, navigationState, authState, queryState } = vi.hoisted(() => ({
  i18nState: { messages: {} as Record<string, unknown> },
  navigationState: { pathname: "/en-CH/admin/overview" },
  authState: {
    ready: true,
    authenticated: true,
    microsoftSsoEnabled: true,
    admin: {
      actor: "sam@example.com",
      authMethod: "microsoft" as const,
      email: "sam@example.com",
      name: "Sam Example",
    },
    logout: vi.fn().mockResolvedValue(undefined),
  },
  queryState: {
    '["admin","overview"]': {
      isLoading: false,
      error: null,
      data: {
        dispatch: {
          queued: 4,
          submitted: 2,
          accepted: 8,
          rejected: 1,
          unknown: 3,
          reconciled: 0,
        },
        payments: {
          pending: 2,
          captured: 7,
          failed: 1,
          refund_pending: 1,
          refunded: 2,
        },
        ambiguousDispatchQueue: 3,
        recentRefunds: 2,
        suspiciousActivityQueue: 1,
        generatedAt: "2026-04-08T19:00:00.000Z",
      },
    },
    '["admin","retention"]': {
      isLoading: false,
      error: null,
      data: {
        contentRetentionDays: 30,
        sessionTtlHours: 72,
        pdfRetentionHours: 24,
        auditRetentionDays: 1095,
        recentCleanups: [],
        pendingExpirations: {
          expiredSessions: 4,
          expiredContent: 2,
          expiredPdfs: 1,
        },
        generatedAt: "2026-04-08T19:01:00.000Z",
      },
    },
  } as Record<string, { isLoading: boolean; error: Error | null; data: unknown }>,
}));

vi.mock("next-intl", () => {
  const getNested = (source: unknown, keyPath: string) =>
    keyPath.split(".").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") {
        return undefined;
      }

      return (value as Record<string, unknown>)[segment];
    }, source);

  const formatMessage = (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? `{${key}}`));

  return {
    useTranslations(namespace?: string) {
      return (key: string, values?: Record<string, unknown>) => {
        const base = namespace ? getNested(i18nState.messages, namespace) : i18nState.messages;
        const value = getNested(base, key);

        if (typeof value !== "string") {
          throw new Error(`Missing translation: ${namespace ? `${namespace}.` : ""}${key}`);
        }

        return formatMessage(value, values);
      };
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({
    queryKey,
  }: {
    queryKey: readonly unknown[];
  }) => queryState[JSON.stringify(queryKey)] ?? { isLoading: false, error: null, data: null },
}));

vi.mock("next/link", async () => {
  const React = await import("react");

  return {
    default: ({ href, children, ...props }: Record<string, unknown>) =>
      React.createElement(
        "a",
        { href: typeof href === "string" ? href : String(href ?? "#"), ...props },
        children,
      ),
  };
});

vi.mock("../src/app/[locale]/admin/admin-auth-context", () => ({
  useAdminAuth: () => authState,
}));

import AdminAccountPage from "../src/app/[locale]/admin/account/page";
import { AdminTopBar } from "../src/app/[locale]/admin/admin-top-bar";
import OverviewPage from "../src/app/[locale]/admin/overview/page";

type MessageTree = Record<string, unknown>;

globalThis.React = React;

function readMessages(locale: string) {
  return JSON.parse(
    readFileSync(path.join(repoRoot, `frontend/src/messages/${locale}.json`), "utf8"),
  ) as MessageTree;
}

afterEach(() => {
  navigationState.pathname = "/en-CH/admin/overview";
  authState.logout.mockClear();
});

describe("admin runtime surfaces", () => {
  it("renders the top bar with operator identity and route actions", () => {
    i18nState.messages = readMessages("en-CH");
    navigationState.pathname = "/en-CH/admin/overview";

    const markup = renderToStaticMarkup(React.createElement(AdminTopBar));

    expect(markup).toContain("Overview");
    expect(markup).toContain("Search");
    expect(markup).toContain("Sam Example");
    expect(markup).toContain('href="/en-CH/admin/account"');
    expect(markup).toContain('href="/en-CH/admin/search"');
  });

  it("renders the account page with translated auth method labels instead of raw enum values", () => {
    i18nState.messages = readMessages("en-CH");
    navigationState.pathname = "/en-CH/admin/account";

    const markup = renderToStaticMarkup(React.createElement(AdminAccountPage));

    expect(markup).toContain("Sam Example");
    expect(markup).toContain("sam@example.com");
    expect(markup).toContain("Authentication method");
    expect(markup).toContain("Microsoft");
    expect(markup).toContain("Managed by");
    expect(markup).not.toContain(">microsoft<");
    expect(markup).toContain('href="/en-CH/admin/overview"');
    expect(markup).toContain('href="/en-CH/admin/search"');
  });

  it("renders overview queues separately from retention follow-up and quick actions", () => {
    i18nState.messages = readMessages("en-CH");
    navigationState.pathname = "/en-CH/admin/overview";

    const markup = renderToStaticMarkup(React.createElement(OverviewPage));

    expect(markup).toContain("Priority queues");
    expect(markup).toContain("Ambiguous dispatches");
    expect(markup).toContain("Suspicious sessions");
    expect(markup).toContain("Retention follow-up");
    expect(markup).toContain("Expired content");
    expect(markup).toContain("Expired PDFs");
    expect(markup).toContain("Quick actions");
    expect(markup).toContain("Retention");
    expect(markup).toContain('href="/en-CH/admin/retention"');
    expect(markup).not.toContain("AI quality");
    expect(markup).not.toContain("Locale distribution");
  });
});
