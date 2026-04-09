import { captureError } from "./error-tracking";

export function normalizeApiBase(apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/api"): string {
  const trimmedBase = apiBase.replace(/\/$/, "");

  try {
    const url = new URL(trimmedBase);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/api";
      return url.toString();
    }
  } catch {
    // Relative values like "/api" are already valid.
  }

  return trimmedBase;
}

export function getApiBase(): string {
  const normalized = normalizeApiBase();

  // Keep browser traffic on the site origin so session cookies survive
  // mobile webviews and refreshes even when production exposes a public API host.
  if (typeof window !== "undefined") {
    return "/api";
  }

  return normalized;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public request: { path: string; method: string } = {
      path: "unknown",
      method: "unknown",
    },
  ) {
    super(`API error ${status}`);
  }

  /** Extract the user-facing message from the canonical error envelope, if present. */
  getUserMessage(): string | null {
    if (typeof this.body === "object" && this.body !== null && "error" in this.body) {
      const envelope = this.body as { error?: { userMessage?: string } };
      if (typeof envelope.error?.userMessage === "string") {
        return envelope.error.userMessage;
      }
    }
    return null;
  }

  /** Extract the canonical error code from the API envelope, if present. */
  getCode(): string | null {
    if (typeof this.body === "object" && this.body !== null && "error" in this.body) {
      const envelope = this.body as { error?: { code?: string } };
      if (typeof envelope.error?.code === "string") {
        return envelope.error.code;
      }
    }
    return null;
  }

  getRequestId(): string | null {
    if (typeof this.body === "object" && this.body !== null && "error" in this.body) {
      const envelope = this.body as { error?: { requestId?: string } };
      if (typeof envelope.error?.requestId === "string") {
        return envelope.error.requestId;
      }
    }
    return null;
  }

  get path(): string {
    return this.request.path;
  }

  get method(): string {
    return this.request.method;
  }
}

export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}

export function getApiErrorUserMessage(
  error: unknown,
  options?: { byCode?: Record<string, string> },
): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const code = error.getCode();
  if (code && options?.byCode?.[code]) {
    return options.byCode[code];
  }

  return error.getUserMessage();
}

export function getApiErrorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.getCode() : null;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Don't set Content-Type for FormData — browser sets it with multipart boundary
  const isFormData = init?.body instanceof FormData;
  const hasBody = init?.body !== undefined && init?.body !== null;
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const method = init?.method ?? "GET";
  const res = await fetch(`${getApiBase()}${path}`, {
    credentials: "include",
    headers,
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = new ApiError(res.status, body, { path, method });

    if (res.status >= 500) {
      captureError(error, {
        component: "apiFetch",
        errorFamily: "request_failure",
        extra: {
          status: res.status,
          path,
          method,
          code: error.getCode() ?? "UNKNOWN",
          requestId: error.getRequestId() ?? "missing",
        },
      });
    }

    throw error;
  }

  return res.json() as Promise<T>;
}

export function getApiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}
