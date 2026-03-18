# Provider Readiness Gate

**Status:** Guardrail reference  
**Purpose:** Define the evidence required before provider-backed features move from shell
implementation to live launch use.  
**See also:** [`provider-certainties.md`](provider-certainties.md) ·
[`swiss-post-api-reference-map.md`](swiss-post-api-reference-map.md) ·
[`../07-operations/pre-launch-checklist.md`](../07-operations/pre-launch-checklist.md)

---

## Core rule

Code structure may be ready before providers are ready.

Do not treat a working adapter shell, mocked flow, or public marketing page as proof that a provider
path is launch-ready.

---

## 1. Evidence standard

Provider readiness requires **current evidence**, not inference from similar systems.

Acceptable evidence includes:

- current provider-issued technical documentation
- sandbox credentials or equivalent validation access
- confirmed deployment/provider configuration
- successful end-to-end tests against the real provider path where applicable

Unacceptable evidence includes:

- old manuals
- third-party blog posts
- inferred behavior from adjacent products
- "it probably works like the default"

---

## 2. Provider gate checklist

| Provider / dependency | Must be proven before launch |
|---|---|
| Swiss Post | onboarding docs, sandbox access, request/response shape, acceptance signal, tracking/reference meaning, webhook vs polling reality |
| Stripe | manual-capture behavior for the locked flow, webhook normalization, refund confirmation path |
| Azure AI | deployment availability, quota sufficiency, streaming behavior, redaction-safe observability |
| Resend | sending domain readiness, template rendering, required webhook subset if used |

If any row is missing proof, the related feature may remain implemented as a shell but must not be
treated as launch-ready.

---

## 3. Swiss Post-specific rule

Swiss Post is the most critical provider-readiness gate because:

- dispatch state truth depends on it
- payment capture timing depends on its acceptance semantics
- attachments and tracking semantics remain provider-shaped

Before launch:

- do not hardcode guessed product identifiers
- do not overstate tracking
- do not claim a deterministic acceptance moment unless the provider contract actually gives one

---

## 4. Stripe-specific rule

The locked payment model depends on a safe relationship between authorization, capture, and dispatch
acceptance.

Before launch:

- webhook handling must be tested end to end
- capture confirmation and refund confirmation must map correctly into canonical states
- support/recovery workflows must be able to explain ambiguous cases truthfully

---

## 5. AI and email provider rule

Azure AI and Resend are less operationally ambiguous than Swiss Post, but still not assumption-free.

Before launch:

- Azure quotas and deployment behavior are verified
- Resend templates and sending domain are ready enough for real customer traffic
- neither provider leaks sensitive content through careless observability paths

---

## 6. Blocked behavior

If provider readiness is incomplete:

- keep adapter internals blocked behind explicit seams
- keep user-facing claims soft and honest
- do not silently code around missing facts

Shell implementation is allowed. False readiness is not.

---

## 7. Launch gate

Before public launch:

- each provider-backed path has current evidence
- evidence is strong enough for the exact implemented behavior
- pre-launch checklist references are satisfied

If those conditions are missing, launch is blocked even if the code compiles.
