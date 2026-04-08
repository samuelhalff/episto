import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const marketingHeaderSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/Header.tsx"),
  "utf8",
);
const flowHeaderSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/FlowHeader.tsx"),
  "utf8",
);
const workspaceMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx"),
  "utf8",
);
const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);
const entryPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/new/page.tsx"),
  "utf8",
);
const statusPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/status/[orderToken]/page.tsx"),
  "utf8",
);

describe("customer header contract", () => {
  it("routes customer-facing headers through the shared desktop language menu and mobile site menu", () => {
    expect(marketingHeaderSource).toContain(
      'import { HeaderLanguageMenu } from "../layout/HeaderLanguageMenu";',
    );
    expect(marketingHeaderSource).toContain("<HeaderLanguageMenu");
    expect(marketingHeaderSource).not.toContain('import { LanguageSwitcher } from "./LanguageSwitcher";');
    expect(flowHeaderSource).toContain("<CustomerSiteMenu");
    expect(flowHeaderSource).toContain("<HeaderLanguageMenu");
    expect(flowHeaderSource).not.toContain("CompactLanguageSwitcher");
    expect(flowHeaderSource).toContain('<div className="sm:hidden">');
    expect(flowHeaderSource).toContain('<div className="mt-3 min-w-0">');
    expect(workspaceMenuSource).toContain('from "../../layout/MenuTriggerButton"');
    expect(workspaceMenuSource).toContain("SheetClose asChild");
    expect(workspaceMenuSource).not.toContain("fixed right-6");
    expect(workspaceMenuSource).toContain("className={triggerSlotClassName}");
    expect(draftShellSource).toContain("<HeaderLanguageMenu");
    expect(entryPageSource).toContain("<HeaderLanguageMenu");
    expect(entryPageSource.match(/<CustomerSiteMenu/g)?.length).toBe(2);
    expect(statusPageSource.match(/<CustomerSiteMenu/g)?.length).toBe(2);
    expect(statusPageSource).toContain("<HeaderLanguageMenu");
  });
});
