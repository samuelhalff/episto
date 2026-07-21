import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/index.js";
import { AppError } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Admin IP allowlist — fail-safe: an empty allowlist MUST never block.
// Parsed lazily from ADMIN_IP_ALLOWLIST on first use; cached until the
// underlying env value changes (rare in practice).
// ---------------------------------------------------------------------------

let allowlistSet: Set<string> | null = null;
let allowlistSource: string | null = null;

function parseAllowlist(): Set<string> {
  const raw = env().ADMIN_IP_ALLOWLIST;

  // Reuse cached set when the raw value hasn't changed.
  if (allowlistSet && allowlistSource === raw) {
    return allowlistSet;
  }

  allowlistSource = raw;

  if (!raw || raw.trim().length === 0) {
    allowlistSet = new Set<string>();
    return allowlistSet;
  }

  allowlistSet = new Set(
    raw
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0),
  );
  return allowlistSet;
}

export async function requireAllowlistedAdminIp(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const allowedIps = parseAllowlist();

  // FAIL-SAFE: an empty allowlist means the feature is disabled — allow all.
  if (allowedIps.size === 0) {
    return;
  }

  if (allowedIps.has(request.ip)) {
    return;
  }

  throw new AppError({
    family: "policy_refusal",
    statusCode: 403,
    code: "ADMIN_IP_NOT_ALLOWED",
    message: `Admin access denied for IP ${request.ip}`,
    userMessage: "Access denied.",
    userAction: null,
  });
}
