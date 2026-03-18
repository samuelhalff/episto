# Pre-Launch Checklist

> Cross-reference: [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for the docs that require API-backed truth before launch sign-off.

## Rule

Do not ship a public production release until every blocking item here is explicitly marked complete by a human reviewer. No placeholders, no invented claims, no "we'll fix it after launch."

---

## 1. Product truth

- [ ] Product name is final everywhere public copy appears
- [ ] Public pricing is approved and matches backend configuration
- [ ] Locked launch pricing is validated against real provider economics and expected support/reconciliation cost
- [ ] Retention values are approved and match runtime configuration
- [ ] Dispatch provider path is confirmed strongly enough to support the implemented adapter
- [ ] Payment capture/refund behavior matches the locked Stripe flow
- [ ] Every public trust claim is consistent with the actual hosting and AI-provider path
- [ ] Provider readiness gate is satisfied for Swiss Post, Stripe, Azure AI, and Resend where applicable
- [ ] Every enabled launch locale has passed native-speaker review for drafting quality, transactional emails, help content, and trust/legal copy
- [ ] Any public usage count, testimonial, or social-proof claim is backed by real evidence
- [ ] Launch acquisition does not rely on SEO alone; at least one additional validation or demand channel is ready

---

## 2. UX and content quality

- [ ] All core routes are specified and implemented without placeholder UI states
- [ ] Empty, loading, error, expired, and ambiguous-provider states are all designed and implemented
- [ ] Core journeys feel materially easier than the manual baseline in live review or moderated testing
- [ ] The launch wedge has been tested with real users before broad release
- [ ] Every primary screen has one obvious next action and no competing primary CTA confusion
- [ ] Users are never asked to repeat information already provided or infer formal-letter structure on their own
- [ ] Preview and edit remain immediately reachable throughout drafting and review
- [ ] Mobile-first flows are tested on iOS Safari and Android Chrome
- [ ] Desktop flows are tested on current Chrome, Safari, and Firefox
- [ ] Core-flow responsiveness supports an INP under 200 ms on representative devices/browsers
- [ ] Async states acknowledge actions immediately and never fall back to blank waits or decorative spinners with no useful status
- [ ] Keyboard navigation works across consumer and admin flows
- [ ] Accessibility passes WCAG AA color contrast and core interaction checks
- [ ] No marketing or product copy implies legal advice, guaranteed delivery, or nonexistent tracking

---

## 3. Data, privacy, and security

- [ ] Privacy policy matches real data flows, including any third-party AI processing
- [ ] Security headers and cookie settings match `security-and-privacy.md`
- [ ] Secrets are stored outside source control and rotated for production
- [ ] Admin access is protected by TLS + HTTP Basic Auth as documented
- [ ] Audit logging exists for privileged admin/support actions
- [ ] Content retention and metadata retention behaviors are verified against config
- [ ] Data-access and deletion handling matches `security-and-privacy.md`

---

## 4. Payments and dispatch

- [ ] Stripe live-mode configuration is verified end-to-end
- [ ] Webhooks are signed, verified, and tested
- [ ] Payment authorization/capture/refund transitions are tested against canonical states
- [ ] Dispatch acceptance, rejection, and unknown/reconciliation paths are tested
- [ ] User wording for references vs tracking is accurate
- [ ] Support can locate a payment or dispatch by internal and provider references
- [ ] Payment and dispatch recovery runbook has been reviewed and dry-run against representative cases

---

## 5. Operational readiness

- [ ] CI passes lint, typecheck, tests, and build
- [ ] Database migrations and rollback path are tested
- [ ] Backup restore test has been completed successfully
- [ ] Error tracking and alerting are configured for frontend, backend, and workers
- [ ] Product analytics and operational dashboards are configured without leaking sensitive content
- [ ] Incident response process in `incident-response.md` is reviewed by the launch owner
- [ ] Support workflow and escalation paths are documented
- [ ] Help/contact page and support triage workflow are live
- [ ] Duplicate-payment, refund, and ambiguous-dispatch cases have named operational ownership
- [ ] Abuse/fraud review workflow is documented and staffed on business days
- [ ] Locale rollout / disable rules are documented for launch
- [ ] Disaster recovery drill has been completed successfully enough to support launch claims

---

## 6. LLM implementation safety

- [ ] No conflicting docs remain for locked decisions
- [ ] No broken internal doc links remain
- [ ] No `CHF X.XX`, `[ProductName]`, `TBD`, or legacy-file references remain in production-facing instructions
- [ ] Every open decision is still clearly marked open and not silently coded around
- [ ] Public claims are backed either by a locked decision or a verified external source
- [ ] A fresh-eye recursive TODO sweep over docs and implementation adds no new material items
- [ ] A helicopter-view review confirms the product still matches the intended end goal, not just local acceptance checks

---

## 7. Release sign-off

| Area | Sign-off required |
|---|---|
| Product and copy | Yes |
| UX and accessibility | Yes |
| Payments and dispatch | Yes |
| Security and privacy | Yes |
| Operations and support | Yes |

Release is blocked if any required sign-off is missing.
