/**
 * Consent infrastructure for analytics.
 *
 * Current state: no third-party analytics → always returns false.
 * When Umami is added, this will check user consent and gate
 * the analytics script accordingly.
 */

const CONSENT_KEY = "privacy_acknowledged";

/** Whether the user has acknowledged the privacy notice. */
export function isPrivacyAcknowledged(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "1";
}

export function acknowledgePrivacy(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, "1");
}

/**
 * Whether analytics consent has been granted.
 * Currently always false — no third-party analytics.
 * When Umami is added, this will check consent state.
 */
export function hasAnalyticsConsent(): boolean {
  return false;
}
