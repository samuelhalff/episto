# Locale Gates and Rollout

**Status:** Authoritative operational plan  
**Scope:** Locale enablement, review, sign-off, rollback, and post-launch maintenance rules.  
**See also:** [`../05-architecture/i18n-rules.md`](../05-architecture/i18n-rules.md) ·
[`pre-launch-checklist.md`](pre-launch-checklist.md) ·
[`../04-product/ai-provider-and-prompts.md`](../04-product/ai-provider-and-prompts.md)

---

## Core rule

Supporting four locales in infrastructure does **not** mean all four are launch-ready at the same
time.

A locale may be enabled publicly only after its copy, drafting quality, emails, help content, and
support handling pass review.

---

## 1. What must be reviewed per locale

| Surface | Required? | Notes |
|---|---|---|
| Product UI copy | Yes | Buttons, labels, warnings, errors |
| AI drafting prompts and outputs | Yes | Locale-specific tone and drafting quality |
| Transactional emails | Yes | Receipt, dispatch updates, refund, resume |
| Help / support content | Yes | Payment, dispatch, refund, resume guidance |
| Trust and legal copy | Yes | Non-legal-service wording, promises, disclaimers |
| Admin/support canned responses | Yes | Support must answer correctly in enabled locales |

No locale is "done enough" if only the UI labels are translated.

---

## 2. Minimum sign-off model

Each locale needs explicit sign-off from:

- product/copy owner
- native-speaker reviewer
- support/operations owner

The sign-off question is not "is this understandable?" It is:

- is the product trustworthy in this locale?
- is the drafting output good enough for launch?
- can support handle issues in this locale without inventing answers?

---

## 3. Launch narrowing rule

If all four locales are not ready at equal quality, narrow launch rather than shipping weak locales.

The infrastructure still supports all locales, but public enablement should be limited to the
reviewed subset.

Do not leave a locale publicly selectable if:

- core copy is incomplete
- drafting quality is noticeably weaker
- help or support responses are not ready

---

## 4. Rollout mechanics

Locale enablement must be controlled by deployment/runtime configuration, not by ad hoc code edits.

Each locale should have:

- infrastructure support in place
- approved message files
- approved transactional email templates
- approved support/canned-response coverage
- launch enablement flag/config

If a quality issue is discovered after launch, operations must be able to disable the locale for new
traffic while preserving access for existing active cases where appropriate.

---

## 5. Ongoing maintenance rule

After a locale launches, every meaningful product change must answer:

- what new user-facing strings were added?
- what new AI behaviors or prompts changed?
- what new help/support content is needed?
- did this change create locale drift?

Do not let one locale quietly become the only fully maintained one.

---

## 6. Relationship to AI quality

Locale readiness and AI quality are linked.

If a locale shows materially higher:

- refusal rate
- manual-correction rate
- regeneration count
- support confusion

then that locale needs review before broader rollout.

---

## 7. Launch gate

Before enabling a locale publicly:

- the QA surfaces in Section 1 are reviewed
- sign-off is recorded
- support coverage exists for that locale
- transactional emails are approved
- the locale can be disabled cleanly if a post-launch issue appears

If those conditions are missing, keep the locale hidden or fallback-only.
