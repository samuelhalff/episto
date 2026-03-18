# Error Taxonomy and User Messages

**Status:** Authoritative reference  
**Supersedes:** earlier error-message planning notes  
**See also:** `docs/05-architecture/system-contracts.md` for state definitions, `docs/08-guardrails/swiss-post-api-reference-map.md` for provider/API-dependent failure surfaces

---

## 1. Goal

Keep errors truthful, actionable, and free of fake certainty. Never expose raw vendor jargon. Never claim success when state is ambiguous.

---

## 2. Canonical Error Families

| # | Family | HTTP Status | Description |
|---|---|---|---|
| 1 | `validation_error` | 400 | Missing or invalid input fields |
| 2 | `policy_refusal` | 422 | Input valid but violates a business rule |
| 3 | `payment_failure` | 402 | Payment not completed or reversed |
| 4 | `dispatch_rejection` | 422 | Provider refused the dispatch submission |
| 5 | `dispatch_ambiguity` | 202 | Dispatch submitted but outcome not yet confirmed |
| 6 | `provider_outage` | 503 | External provider temporarily unreachable |
| 7 | `tracking_unavailable` | 404 | Provider reference exists but tracking data is not available |
| 8 | `file_upload_failure` | 422 | File upload rejected (size, type, quota) |
| 9 | `rendering_failure` | 500 | PDF generation job failed |
| 10 | `retention_cleanup_failure` | 500 | Background retention job failed (internal; not user-facing) |

---

## 3. Structured Error Response Format

All backend error responses use this shape. Frontend error handling must be coded against this contract.

```typescript
// shared/errors.ts

export interface ApiErrorResponse {
  error: {
    code:     string;           // machine-readable, snake_case (e.g. 'validation_error')
    family:   ErrorFamily;      // one of the 10 canonical families above
    message:  string;           // human-readable; safe to show in dev; may differ from userMessage
    userMessage: string;        // localized, safe to display to end users
    userAction:  string | null; // what the user can do next; null if no action available
    fields?: Array<{            // present only for validation_error
      field: string;
      message: string;
    }>;
    requestId?: string;         // trace ID for support
  };
}

export type ErrorFamily =
  | 'validation_error'
  | 'policy_refusal'
  | 'payment_failure'
  | 'dispatch_rejection'
  | 'dispatch_ambiguity'
  | 'provider_outage'
  | 'tracking_unavailable'
  | 'file_upload_failure'
  | 'rendering_failure'
  | 'retention_cleanup_failure';
```

### Example responses

```json
// validation_error — 400
{
  "error": {
    "code": "validation_error",
    "family": "validation_error",
    "message": "Request body failed validation",
    "userMessage": "Some required details are missing or invalid.",
    "userAction": "Please review the highlighted fields and try again.",
    "fields": [
      { "field": "recipient.postalCode", "message": "Must be a 4-digit Swiss postal code" }
    ]
  }
}

// dispatch_rejection — 422
{
  "error": {
    "code": "dispatch_rejection",
    "family": "dispatch_rejection",
    "message": "Provider rejected submission: [normalized reason]",
    "userMessage": "Your payment succeeded, but dispatch was rejected by the postal provider.",
    "userAction": "We are reversing the charge. Please contact support if you need assistance.",
    "requestId": "req_01HX..."
  }
}

// dispatch_ambiguity — 202
{
  "error": {
    "code": "dispatch_ambiguity",
    "family": "dispatch_ambiguity",
    "message": "Provider response was ambiguous; reconciliation pending",
    "userMessage": "We could not confirm dispatch yet.",
    "userAction": "We are checking the provider response. You will be notified once the status is confirmed.",
    "requestId": "req_01HX..."
  }
}
```

---

## 4. HTTP Status Code Mapping

| Family | Status | Rationale |
|---|---|---|
| `validation_error` | 400 | Malformed or incomplete client input |
| `policy_refusal` | 422 | Semantically valid but refused by business rules |
| `payment_failure` | 402 | Payment Required — payment not completed |
| `dispatch_rejection` | 422 | Provider decision; semantically refused |
| `dispatch_ambiguity` | 202 | Accepted for processing; outcome pending |
| `provider_outage` | 503 | Service temporarily unavailable (retry possible) |
| `tracking_unavailable` | 404 | Resource not found or not yet available |
| `file_upload_failure` | 422 | Upload refused by policy |
| `rendering_failure` | 500 | Internal server error |
| `retention_cleanup_failure` | 500 | Internal server error (not user-facing) |

---

## 5. User-Message Rules

1. **Say what failed.** Never return a generic "something went wrong" for a known failure type.
2. **Say what the user can do next.** Always populate `userAction` if any action is available.
3. **Do not expose raw vendor jargon.** Normalize provider codes to canonical descriptions before surfacing them.
4. **Do not claim success when state is ambiguous.** If outcome is `unknown`, say so.
5. **Do not collapse `pending` and `sent`.** They are different states with different user implications.

---

## 6. Required Distinctions

These distinctions must be maintained in both backend responses and frontend UI copy:

| Incorrect collapse | Correct distinction |
|---|---|
| "payment failed" = "dispatch failed" | These are separate failures with separate user actions |
| "reference created" = "tracking available" | A reference being created does not mean tracking data exists |
| "submitted" = "accepted" | Submitted means the HTTP request was made; accepted means the provider confirmed |
| "accepted" = "delivered" | Accepted means in provider possession; delivered is unconfirmed |
| "dispatch pending" = "dispatch sent" | Never combine ambiguous and confirmed states |

---

## 7. Example User-Facing Copy Patterns

| Family | Pattern |
|---|---|
| `validation_error` | "Some required details are missing or invalid. Please review the highlighted fields." |
| `payment_failure` | "Payment was not completed. No dispatch was submitted. Please try again or use a different payment method." |
| `dispatch_rejection` | "Your payment succeeded, but dispatch was rejected. We are reversing the charge or escalating the case." |
| `dispatch_ambiguity` | "We could not confirm dispatch yet. We are checking the provider response before showing a final result." |
| `tracking_unavailable` | "A provider reference exists, but tracking details are not available for this dispatch type." |
| `provider_outage` | "The postal provider is temporarily unreachable. Please try again in a few minutes." |
| `file_upload_failure` | "The file could not be uploaded. Please check the file size and type, then try again." |
| `rendering_failure` | "We could not generate your PDF. Please try again. If this persists, contact support." |

---

## 8. Admin Rule

Raw provider codes and payloads may be stored in `dispatch_status_events` and `support_events` for support purposes. They must always be mapped to canonical error families before being surfaced in any user-facing response or frontend component.

---

## Cross-References

| Document | Relationship |
|---|---|
| `docs/05-architecture/system-contracts.md` | State definitions that determine which error family applies |
| `docs/05-architecture/backend-architecture.md` | Module ownership of each error family |
| `docs/08-guardrails/` | Anti-hallucination rules that prevent fake success states |
| `shared/errors.ts` | TypeScript types for `ApiErrorResponse` and `ErrorFamily` |
