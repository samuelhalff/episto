import { routing } from "../i18n/routing";

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
