/**
 * Consent infrastructure for analytics.
 *
 * The site loads Google Analytics only after the visitor explicitly grants
 * analytics consent (strict opt-in). Until then nothing is sent to Google.
 * Consent is persisted in localStorage and broadcast so the banner and the
 * GA loader react without a reload.
 */

const ACK_KEY = "privacy_acknowledged";
const ANALYTICS_KEY = "analytics_consent";
const CONSENT_EVENT = "episto:consent-change";

export type AnalyticsConsent = "granted" | "denied" | null;

/** Whether the user has acted on the privacy notice (accepted or declined). */
export function isPrivacyAcknowledged(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ACK_KEY) === "1";
}

export function acknowledgePrivacy(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACK_KEY, "1");
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Current analytics consent: "granted", "denied", or null (undecided). */
export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(ANALYTICS_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setAnalyticsConsent(value: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANALYTICS_KEY, value);
  // Deciding on analytics also dismisses the privacy notice.
  localStorage.setItem(ACK_KEY, "1");
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === "granted";
}

/**
 * Subscribe to consent changes (same tab via a custom event, other tabs via
 * the storage event). Returns an unsubscribe function.
 */
export function subscribeConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
