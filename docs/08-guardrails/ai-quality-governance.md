# AI Quality Governance

**Status:** Guardrail reference  
**Purpose:** Keep AI drafting quality, safety, and operational control explicit before and during
implementation.  
**See also:** [`../04-product/ai-provider-and-prompts.md`](../04-product/ai-provider-and-prompts.md)
· [`../04-product/content-moderation.md`](../04-product/content-moderation.md) ·
[`../07-operations/analytics-and-observability.md`](../07-operations/analytics-and-observability.md)

---

## Core rule

Do not change prompts, model routing, or safety behavior casually.

If a change affects customer-visible drafting quality, it must be:

- versioned
- reviewable
- measurable
- reversible

---

## 1. Prompt and model versioning

The AI path must have explicit versions for:

- prompt templates
- system instructions
- model/deployment routing
- safety/moderation thresholds where applicable

No production AI change should exist only in an untracked string literal.

---

## 2. Regression corpus

Before enabling live traffic on a meaningful AI change, evaluate against a regression corpus that
covers:

- common letter categories
- blocked-content categories
- multilingual cases across `de-CH`, `fr-CH`, `it-CH`, `en-CH`
- missing-field extraction and follow-up behavior
- cases with high manual-correction risk

The goal is not to prove perfection. It is to catch obvious regressions before customers do.

---

## 3. Quality review gate

An AI change is not ready merely because it "sounds okay" in a few examples.

Review should ask:

- did drafting quality improve or regress?
- did refusals increase unexpectedly?
- did locale quality drift?
- did the change weaken the non-legal-service boundary?
- did it create new overconfident wording?

If the answers are unclear, do not silently ship the change.

---

## 4. Degradation and kill switches

episto must be able to degrade AI behavior honestly.

Examples:

- disable AI drafting while keeping manual editing available
- disable a problematic locale from AI-assisted drafting
- fall back from streaming to non-streaming if the contract still preserves truthful UX

Do not silently downgrade the final-draft experience in a way that changes product truth without a
documented operational choice.

---

## 5. Telemetry requirements

Track at least:

- first-response latency
- full-draft latency
- refusal rate
- timeout and provider-outage rate
- regeneration count
- manual-correction rate
- locale split

Telemetry must stay metadata-first and must not log prompt/body content casually.

---

## 6. Azure readiness linkage

AI quality governance depends on real provider readiness.

Before live traffic, verify:

- deployment names resolve correctly
- quota/rate limits are adequate
- content filtering does not silently break UX
- observability paths do not leak prompt/body content

If those conditions are not met, AI quality is not launch-ready even if the prompts look good.

---

## 7. Launch gate

Before public launch:

- prompt/model versions are explicit
- a regression corpus exists
- locale-sensitive review has happened
- degradation and kill-switch behavior is documented
- telemetry exists for quality and latency

If these are missing, AI implementation is not ready for customer trust.
