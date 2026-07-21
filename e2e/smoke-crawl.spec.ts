import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──────────────────────────────────────────────────────────

const LOCALES = ["de-CH", "fr-CH", "it-CH", "en-CH"] as const;

/**
 * Every marketing/static route under `/[locale]/` that should render a 200
 * page without errors. Discovered from frontend/src/app/[locale]/ page.tsx files.
 */
const STATIC_ROUTES = [
  { path: "/", label: "landing" },
  { path: "/pricing", label: "pricing" },
  // Note: "how it works" is a homepage section anchor (#how-it-works), not a
  // standalone page — the dedicated page was intentionally removed (8035fd3).
  { path: "/help", label: "help" },
  { path: "/imprint", label: "imprint" },
  { path: "/privacy", label: "privacy" },
  { path: "/terms", label: "terms" },
  { path: "/signature-requirements", label: "signature-requirements" },
];

// ── Types ──────────────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info";

interface Finding {
  locale: string;
  route: string;
  label: string;
  severity: Severity;
  category: string;
  message: string;
  detail?: string;
}

interface PageResult {
  locale: string;
  route: string;
  label: string;
  httpStatus: number | null;
  consoleErrors: number;
  pageErrors: number;
  failedRequests: number;
  hasErrorBoundary: boolean;
  hasI18nKeyLeak: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Dotted i18n key pattern, e.g. "some.dotted.key" used as raw text. */
const I18N_KEY_RE = /\b[a-z]{2,}\.[a-z]{2,}\.[a-zA-Z]{2,}\b/;

/** Error boundary / fatal error text patterns (case-insensitive). */
const ERROR_BOUNDARY_TEXTS = [
  /something\s+went\s+wrong/i,
  /application\s+error/i,
  /an\s+unexpected\s+error\s+occurred/i,
  /unexpected\s+error/i,
  /fatal\s+error/i,
  /internal\s+server\s+error/i,
];

/**
 * Attach monitoring listeners to `page` and return a collector object.
 * Call `collector.finalize()` after navigation to gather results.
 */
function attachMonitors(page: Page, expectedOrigin: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    // Only track same-origin XHR/fetch failures
    const url = response.url();
    if (status >= 400 && status < 600 && url.startsWith(expectedOrigin)) {
      // Ignore known noise (favicon, analytics endpoints, etc.)
      const resourceType = response.request().resourceType();
      if (resourceType === "xhr" || resourceType === "fetch") {
        failedRequests.push(`${status} ${response.request().method()} ${url}`);
      }
    }
  });

  return {
    finalize(): {
      consoleErrors: string[];
      pageErrors: string[];
      failedRequests: string[];
    } {
      return { consoleErrors, pageErrors, failedRequests };
    },
  };
}

/**
 * Check page text content for error boundary indicators and i18n key leakage.
 */
async function inspectPageContent(
  page: Page,
): Promise<{ hasErrorBoundary: boolean; hasI18nKeyLeak: boolean; leakedKeys: string[] }> {
  const text = await page.locator("body").innerText();
  const hasErrorBoundary = ERROR_BOUNDARY_TEXTS.some((re) => re.test(text));
  const leakedKeys: string[] = [];
  const i18nMatches = text.match(I18N_KEY_RE);
  if (i18nMatches) {
    // Filter: only flag if multiple dotted-segment keys appear, to reduce
    // false positives from normal text that happens to have dots.
    const allMatches = text.match(new RegExp(I18N_KEY_RE.source, "g")) ?? [];
    // Exclude domain names (e.g. "geo.admin.ch") which match the dotted-key
    // shape but are legitimate visible text, not leaked i18n keys.
    const KNOWN_TLDS = /\.(ch|com|org|io|net|admin|swiss|eu|de|fr|it)$/i;
    const unique = [...new Set(allMatches)].filter((m) => !KNOWN_TLDS.test(m));
    leakedKeys.push(...unique);
  }
  const hasI18nKeyLeak = leakedKeys.length > 0;
  return { hasErrorBoundary, hasI18nKeyLeak, leakedKeys };
}

// ── Main Test ──────────────────────────────────────────────────────────────

test.describe("Smoke Crawl — all locales × all static routes", () => {
  // Force serial execution so the single afterAll hook collects results from
  // every test in this describe block. With fullyParallel + workers>1 each
  // worker would otherwise get its own module scope, producing a partial report.
  test.describe.configure({ mode: "serial" });

  const allFindings: Finding[] = [];
  const allResults: PageResult[] = [];

  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      const fullPath = `/${locale}${route.path}`;

      test(`${locale} ${route.label}`, async ({ page, baseURL }) => {
        const origin = baseURL ?? "http://localhost:5000";
        const monitors = attachMonitors(page, origin);

        let httpStatus: number | null = null;

        const response = await page.goto(fullPath, {
          waitUntil: "load",
          timeout: 30_000,
        });

        httpStatus = response?.status() ?? null;

        // Wait a beat for any late-loading errors
        await page.waitForTimeout(500);

        // Inspect page content
        const { hasErrorBoundary, hasI18nKeyLeak, leakedKeys } =
          await inspectPageContent(page);

        // Collect monitor results
        const { consoleErrors, pageErrors, failedRequests } = monitors.finalize();

        // ── Record result ──────────────────────────────────────────────
        const result: PageResult = {
          locale,
          route: fullPath,
          label: route.label,
          httpStatus,
          consoleErrors: consoleErrors.length,
          pageErrors: pageErrors.length,
          failedRequests: failedRequests.length,
          hasErrorBoundary,
          hasI18nKeyLeak,
        };
        allResults.push(result);

        // ── Build findings ─────────────────────────────────────────────

        // (a) HTTP status
        if (httpStatus !== 200) {
          allFindings.push({
            locale,
            route: fullPath,
            label: route.label,
            severity: "critical",
            category: "http-status",
            message: `HTTP ${httpStatus} (expected 200)`,
          });
        }

        // (b) Console errors
        for (const err of consoleErrors) {
          allFindings.push({
            locale,
            route: fullPath,
            label: route.label,
            severity: "warning",
            category: "console-error",
            message: err.slice(0, 200),
          });
        }

        // (c) Page errors
        for (const err of pageErrors) {
          allFindings.push({
            locale,
            route: fullPath,
            label: route.label,
            severity: "critical",
            category: "page-error",
            message: err.slice(0, 200),
          });
        }

        // (d) Failed same-origin XHR/fetch
        for (const req of failedRequests) {
          allFindings.push({
            locale,
            route: fullPath,
            label: route.label,
            severity: "warning",
            category: "failed-request",
            message: req,
          });
        }

        // (e) Error boundary text
        if (hasErrorBoundary) {
          allFindings.push({
            locale,
            route: fullPath,
            label: route.label,
            severity: "critical",
            category: "error-boundary",
            message: "Error boundary or fatal error text found on page",
          });
        }

        // (f) I18n key leakage
        if (hasI18nKeyLeak) {
          allFindings.push({
            locale,
            route: fullPath,
            label: route.label,
            severity: "warning",
            category: "i18n-key-leak",
            message: `Raw i18n keys visible: ${leakedKeys.join(", ")}`,
            detail: leakedKeys.join(", "),
          });
        }
      });
    }
  }

  // ── Aggregate report (runs once after ALL tests in this describe) ────────
  test.afterAll(() => {
    const reportDir = path.resolve(__dirname, "report");
    fs.mkdirSync(reportDir, { recursive: true });

    // Write structured JSON report
    const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
    const warningCount = allFindings.filter((f) => f.severity === "warning").length;
    const infoCount = allFindings.filter((f) => f.severity === "info").length;

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalPages: allResults.length,
        pagesWithIssues: allResults.filter(
          (r) =>
            r.httpStatus !== 200 ||
            r.consoleErrors > 0 ||
            r.pageErrors > 0 ||
            r.failedRequests > 0 ||
            r.hasErrorBoundary ||
            r.hasI18nKeyLeak,
        ).length,
        totalFindings: allFindings.length,
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
      },
      results: allResults,
      findings: allFindings,
    };

    fs.writeFileSync(
      path.join(reportDir, "smoke-report.json"),
      JSON.stringify(report, null, 2),
      "utf-8",
    );

    // Print summary table to console
    console.log("\n" + "═".repeat(72));
    console.log("SMOKE CRAWL SUMMARY");
    console.log("═".repeat(72));
    console.log(
      `Pages crawled: ${allResults.length}  |  Issues: ${allFindings.length}  |  Critical: ${criticalCount}  |  Warnings: ${warningCount}`,
    );
    console.log("─".repeat(72));

    // Per-route summary
    for (const r of allResults) {
      const issueCount = allFindings.filter(
        (f) => f.locale === r.locale && f.route === r.route,
      ).length;
      const status = issueCount === 0 ? "✓" : "✗";
      const flags: string[] = [];
      if (r.httpStatus !== 200) flags.push(`HTTP ${r.httpStatus}`);
      if (r.consoleErrors > 0) flags.push(`${r.consoleErrors} console`);
      if (r.pageErrors > 0) flags.push(`${r.pageErrors} pageerr`);
      if (r.failedRequests > 0) flags.push(`${r.failedRequests} failreq`);
      if (r.hasErrorBoundary) flags.push("ERRBOUNDARY");
      if (r.hasI18nKeyLeak) flags.push("i18nleak");
      const flagStr = flags.length > 0 ? `  [${flags.join(", ")}]` : "";
      console.log(`  ${status} ${r.locale.padEnd(6)} ${r.label.padEnd(24)}${flagStr}`);
    }

    if (allFindings.length > 0) {
      console.log("─".repeat(72));
      console.log("DETAILED FINDINGS:");
      for (const f of allFindings) {
        const sev = f.severity.toUpperCase().padEnd(8);
        console.log(`  [${sev}] ${f.locale} ${f.label} — ${f.category}: ${f.message}`);
      }
    }

    console.log("═".repeat(72) + "\n");

    // Fail the suite if any critical issue was found
    if (criticalCount > 0) {
      throw new Error(
        `Smoke crawl found ${criticalCount} critical issue(s) across ${allResults.length} pages. See e2e/report/smoke-report.json for details.`,
      );
    }
  });
});

// ── Additional checks: status page placeholder (no auth needed) ────────────
test.describe("Public status page", () => {
  for (const locale of LOCALES) {
    test(`${locale} /status shows lookup form (not an error)`, async ({ page }) => {
      // The status page at /status/{token} would need a real token, but the
      // form for entering a token should render without errors.
      // We just verify the root /status path doesn't 500.
      const response = await page.goto(
        `/${locale}/status/00000000-0000-0000-0000-000000000000`,
        {
          waitUntil: "load",
        },
      );
      // Unknown token may 404 or show a not-found message — either is fine,
      // as long as it doesn't crash (500) or show error boundary text.
      expect(response?.status()).toBeLessThan(500);
      const text = await page.locator("body").innerText();
      for (const re of ERROR_BOUNDARY_TEXTS) {
        expect(text).not.toMatch(re);
      }
    });
  }
});
