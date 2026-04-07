import { ApiError, getApiUrl } from "./api";

/**
 * Fetch a protected binary resource from the API and trigger a browser download.
 * Uses session credentials and the standard XMLHttpRequest marker so the backend
 * can distinguish XHR from navigation requests.
 */
export async function downloadFile(path: string, fallbackFileName = "letter.pdf"): Promise<void> {
  const res = await fetch(getApiUrl(path), {
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body, { path, method: "GET" });
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  // Derive file name from Content-Disposition header when available
  const disposition = res.headers.get("Content-Disposition");
  let fileName = fallbackFileName;
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i.exec(disposition);
    if (match?.[1]) {
      fileName = decodeURIComponent(match[1].trim());
    }
  }

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
