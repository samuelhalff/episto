import { routing } from "../i18n/routing";

export interface AdminSearchNavigationItem {
  kind: "draft" | "session" | "payment_attempt" | "dispatch_attempt";
  id: string;
  draftId: string | null;
  sessionId: string | null;
}

function isSupportedLocale(value: string | undefined): value is (typeof routing.locales)[number] {
  return routing.locales.includes(value as (typeof routing.locales)[number]);
}

export function getAdminBasePath(pathname: string): string {
  const [, maybeLocale] = pathname.split("/");
  const locale = isSupportedLocale(maybeLocale) ? maybeLocale : routing.defaultLocale;
  return `/${locale}/admin`;
}

export function getAdminPagePath(pathname: string, pagePath: string): string {
  const normalizedPagePath = pagePath.replace(/^\/+/, "");
  const basePath = getAdminBasePath(pathname);
  return normalizedPagePath ? `${basePath}/${normalizedPagePath}` : basePath;
}

export function getAdminSearchResultPath(
  pathname: string,
  result: AdminSearchNavigationItem,
): string {
  if (result.kind === "session") {
    const sessionId = result.sessionId ?? result.id;
    return getAdminPagePath(pathname, `sessions/${sessionId}`);
  }

  if (result.draftId) {
    return getAdminPagePath(pathname, `drafts/${result.draftId}`);
  }

  if (result.sessionId) {
    return getAdminPagePath(pathname, `sessions/${result.sessionId}`);
  }

  return getAdminPagePath(pathname, "");
}
