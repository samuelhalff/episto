/**
 * Tracking module — shell only.
 *
 * Tracking depends on the postal dispatch provider's API capabilities.
 * Per project rules, we do NOT fabricate tracking behavior.
 *
 * What we know:
 * - Swiss Post Digital Commerce API may provide status webhooks or polling endpoints
 * - The exact capabilities are not yet confirmed
 * - We model tracking as dispatch_status_events (append-only log)
 *
 * What this module will do when implemented:
 * 1. Poll provider for dispatch status updates (if polling is supported)
 * 2. Receive webhooks from provider (if webhooks are supported)
 * 3. Map provider-specific status to canonical DispatchState
 * 4. Record dispatch_status_events
 * 5. Transition dispatch_attempts state
 *
 * What this module does NOT do:
 * - Invent tracking numbers or statuses
 * - Claim delivery confirmation unless the provider explicitly reports it
 * - Treat "submitted" as "delivered"
 */

export interface TrackingAdapter {
  /**
   * Check the current status of a dispatch via provider reference.
   * Returns null if the provider doesn't support status checking
   * or the reference is not found.
   */
  checkStatus(providerReference: string): Promise<TrackingStatus | null>;
}

export interface TrackingStatus {
  providerState: string;
  canonicalState: string;
  rawData: unknown;
  checkedAt: Date;
}

/**
 * Stub tracking adapter.
 * Throws because we don't have a confirmed provider API.
 */
export class StubTrackingAdapter implements TrackingAdapter {
  async checkStatus(_providerReference: string): Promise<TrackingStatus | null> {
    throw new Error(
      "Tracking adapter not yet configured. Provider integration pending.",
    );
  }
}

export function getTrackingAdapter(): TrackingAdapter {
  // TODO: Replace with real adapter when provider API is confirmed
  return new StubTrackingAdapter();
}
