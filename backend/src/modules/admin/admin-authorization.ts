/**
 * Admin authorization allowlist.
 *
 * Microsoft SSO only proves the caller belongs to the configured tenant — it is
 * NOT authorization. For a live-payments admin we additionally require the
 * identity to be on an explicit allowlist of Entra object-ids (preferred, they
 * are tenant-stable) or emails (a simple emergency/test fallback). Enforced at
 * both the login callback and on every request (so removing an identity takes
 * effect immediately, not after the cookie TTL).
 */

export function csvSet(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0),
  );
}

export function isAllowedAdmin(
  identity: { oid?: string | undefined; email?: string | undefined },
  config: {
    ADMIN_MICROSOFT_ALLOWED_OIDS: string;
    ADMIN_MICROSOFT_ALLOWED_EMAILS: string;
  },
): boolean {
  const oids = csvSet(config.ADMIN_MICROSOFT_ALLOWED_OIDS);
  const emails = csvSet(config.ADMIN_MICROSOFT_ALLOWED_EMAILS);
  const oid = identity.oid?.trim().toLowerCase();
  const email = identity.email?.trim().toLowerCase();
  return Boolean((oid && oids.has(oid)) || (email && emails.has(email)));
}
